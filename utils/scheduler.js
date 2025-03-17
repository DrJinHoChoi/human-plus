const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { BannerUpdater } = require('./bannerUpdater');
const { LanguageUpdater } = require('./languageUpdater');
const logger = require('./logger');
const apiClient = require('./apiClient');

/**
 * 스케줄러 클래스 - 자동화된 콘텐츠 업데이트 관리
 */
class Scheduler {
    constructor() {
        this.schedule = process.env.UPDATE_SCHEDULE || '0 0 * * *'; // 기본값: 매일 0시
        this.isRunning = false;
        this.lastRun = null;
        this.nextRun = null;
        this.cronJob = null;
        this.statusFilePath = path.join(__dirname, '../logs/scheduler-status.json');
        this.lastStatus = {
            contentGeneration: { success: false, timestamp: null, details: {} },
            bannerUpdates: { success: false, timestamp: null, details: {} },
            languageUpdates: { success: false, timestamp: null, details: {} }
        };

        // 의존성 초기화
        this.bannerUpdater = new BannerUpdater();
        this.languageUpdater = new LanguageUpdater();

        this.loadStatus();
    }

    /**
     * 스케줄러 상태 저장
     */
    async saveStatus() {
        try {
            const logsDir = path.dirname(this.statusFilePath);
            try {
                await fs.access(logsDir);
            } catch {
                await fs.mkdir(logsDir, { recursive: true });
            }

            const status = {
                schedule: this.schedule,
                lastRun: this.lastRun,
                nextRun: this.nextRun,
                lastStatus: this.lastStatus,
                isRunning: this.isRunning
            };

            await fs.writeFile(
                this.statusFilePath,
                JSON.stringify(status, null, 2),
                'utf8'
            );

            logger.debug('Scheduler status saved');
        } catch (error) {
            logger.error('Failed to save scheduler status:', error);
        }
    }

    /**
     * 스케줄러 상태 불러오기
     */
    async loadStatus() {
        try {
            await fs.access(this.statusFilePath);
            const data = await fs.readFile(this.statusFilePath, 'utf8');
            const status = JSON.parse(data);
            
            this.lastRun = status.lastRun;
            this.nextRun = status.nextRun;
            this.lastStatus = status.lastStatus || this.lastStatus;
            
            logger.info('Scheduler status loaded successfully');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Error loading scheduler status:', error);
            } else {
                logger.info('No previous scheduler status found');
            }
        }
    }

    /**
     * 스케줄러 초기화 및 시작
     */
    start() {
        if (this.cronJob) {
            this.cronJob.stop();
        }

        this.cronJob = cron.schedule(this.schedule, async () => {
            await this.runUpdates();
        });

        // 다음 실행 시간 계산
        this.updateNextRunTime();
        this.saveStatus();

        logger.info(`Scheduler started with schedule: ${this.schedule}`);
        logger.info(`Next scheduled run: ${this.nextRun}`);
    }

    /**
     * 다음 실행 시간 업데이트
     */
    updateNextRunTime() {
        const cronParser = require('cron-parser');
        try {
            const interval = cronParser.parseExpression(this.schedule);
            this.nextRun = interval.next().toDate();
        } catch (error) {
            logger.error('Failed to parse cron schedule:', error);
            this.nextRun = null;
        }
    }

    /**
     * 다음 실행 시간 조회
     */
    getNextRunTime() {
        return this.nextRun;
    }

    /**
     * 스케줄러 중지
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            logger.info('Scheduler stopped');
        }
    }

    /**
     * 새로운 콘텐츠 생성
     */
    async generateNewContent() {
        try {
            logger.scheduler.start('New content generation');
            
            // API 클라이언트 상태 확인
            const apiStatus = await apiClient.checkAPIStatus();
            if (!apiStatus.success) {
                throw new Error('API service unavailable');
            }
            
            // 여기에 콘텐츠 생성 로직 추가
            // 버전 1부터 6까지의 언어 파일 업데이트
            logger.info('Generating texts for all versions');
            const versions = [1, 2, 3, 4, 5, 6];
            for (const version of versions) {
                try {
                    await this.languageUpdater.generateRandomContent(version);
                    logger.info(`Generated content for version ${version}`);
                } catch (err) {
                    logger.error(`Failed to generate content for version ${version}:`, err);
                }
            }
            
            this.lastStatus.contentGeneration = {
                success: true,
                timestamp: new Date(),
                details: { message: 'Content generated successfully' }
            };
            
            logger.scheduler.complete('New content generation');
            return true;
        } catch (error) {
            this.lastStatus.contentGeneration = {
                success: false,
                timestamp: new Date(),
                details: { error: error.message }
            };
            
            logger.scheduler.error('New content generation', error);
            return false;
        }
    }

    /**
     * 배너 이미지 업데이트
     */
    async updateBanners() {
        try {
            logger.scheduler.start('Banner updates');
            
            // 모든 페이지 타입에 대한 배너 업데이트
            const bannerTypes = Object.keys(this.bannerUpdater.bannerTypes);
            const results = {};
            
            for (const pageType of bannerTypes) {
                try {
                    const config = this.bannerUpdater.bannerTypes[pageType];
                    for (let i = 1; i <= config.count; i++) {
                        const variant = Math.floor(Math.random() * config.variants) + 1;
                        const targetFile = `${config.prefix}${i}-v${variant}.png`;
                        
                        // 배너 업데이트
                        await this.bannerUpdater.updateBanner(pageType, targetFile);
                        results[`${pageType}-${i}`] = { success: true, variant };
                    }
                } catch (error) {
                    results[pageType] = { success: false, error: error.message };
                    logger.error(`Failed to update banner for ${pageType}:`, error);
                }
            }
            
            // 상태 업데이트
            this.lastStatus.bannerUpdates = {
                success: Object.values(results).every(r => r.success),
                timestamp: new Date(),
                details: results
            };
            
            logger.scheduler.complete('Banner updates');
            return true;
        } catch (error) {
            this.lastStatus.bannerUpdates = {
                success: false,
                timestamp: new Date(),
                details: { error: error.message }
            };
            
            logger.scheduler.error('Banner updates', error);
            return false;
        }
    }

    /**
     * 다국어 콘텐츠 업데이트
     */
    async updateLanguages() {
        try {
            logger.scheduler.start('Language updates');
            
            const results = {};
            
            // 모든 언어 파일 버전 업데이트
            for (let version = 1; version <= 6; version++) {
                try {
                    const result = await this.languageUpdater.updateLanguageFile('en', version);
                    results[`version-${version}`] = { success: true, languages: result.languages };
                } catch (error) {
                    results[`version-${version}`] = { success: false, error: error.message };
                    logger.error(`Failed to update language files for version ${version}:`, error);
                }
            }
            
            // 상태 업데이트
            this.lastStatus.languageUpdates = {
                success: Object.values(results).every(r => r.success),
                timestamp: new Date(),
                details: results
            };
            
            logger.scheduler.complete('Language updates');
            return true;
        } catch (error) {
            this.lastStatus.languageUpdates = {
                success: false,
                timestamp: new Date(),
                details: { error: error.message }
            };
            
            logger.scheduler.error('Language updates', error);
            return false;
        }
    }

    /**
     * 모든 업데이트 실행
     */
    async runUpdates() {
        if (this.isRunning) {
            logger.warn('Update already in progress, skipping');
            return;
        }

        // 시작 시간 기록
        const startTime = new Date();
        this.isRunning = true;
        this.lastRun = startTime;
        
        logger.info('Starting scheduled content update');
        
        try {
            // 주요 업데이트 작업 실행
            await this.generateNewContent();
            await this.updateBanners();
            await this.updateLanguages();
            
            // 다음 실행 시간 계산 및 상태 저장
            this.updateNextRunTime();
            
            // 종료 시간 및 소요 시간 기록
            const endTime = new Date();
            const duration = (endTime - startTime) / 1000; // 초 단위
            
            logger.info(`Scheduled update completed in ${duration} seconds`);
        } catch (error) {
            logger.error('Scheduled update failed:', error);
        } finally {
            this.isRunning = false;
            await this.saveStatus();
        }
    }
}

// 스케줄러 인스턴스 생성
const scheduler = new Scheduler();

/**
 * 스케줄러 초기화 함수
 */
function initializeScheduler() {
    try {
        scheduler.start();
        return true;
    } catch (error) {
        logger.error('Failed to initialize scheduler:', error);
        return false;
    }
}

module.exports = {
    scheduler,
    initializeScheduler
};
