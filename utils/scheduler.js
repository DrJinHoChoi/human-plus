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
            const bannerUpdater = new BannerUpdater();
            const results = {
                success: true,
                timestamp: new Date(),
                details: {}
            };
            
            logger.info('Starting banner update process for all types');
            
            // 모든 배너 유형에 대해 처리
            const bannerTypes = [
                { type: 'index-hero', count: 3, bannerFile: 'banner-1.png' },
                { type: 'news-hero', count: 1, bannerFile: 'banner-2.png' },
                { type: 'history-hero', count: 1, bannerFile: 'banner-3.png' },
                { type: 'technology-hero', count: 1, bannerFile: 'banner-4.png' },
                { type: 'vision-card', count: 4, bannerFile: 'banner-5.png' },
                { type: 'company-overview', count: 3, bannerFile: 'banner-6.png' },
                { type: 'electronics', count: 1, bannerFile: 'banner-7.png' },
                { type: 'cnc', count: 1, bannerFile: 'banner-8.png' }
            ];
            
            // 순차적으로 각 배너 업데이트 (배너 생성은 리소스 집약적이므로 병렬보다 순차 선호)
            for (const bannerType of bannerTypes) {
                try {
                    logger.info(`Updating banner type: ${bannerType.type}`);
                    
                    // 각 유형별로 필요한 개수만큼 배너 생성
                    for (let i = 1; i <= bannerType.count; i++) {
                        try {
                            // 랜덤 변형 선택 (각 배너 유형별 변형 수에 따라)
                            const variant = Math.floor(Math.random() * 5) + 1; // 1-5 중 랜덤
                            
                            // 표준화된 파일명 사용
                            const fileName = `${bannerType.type}-${i}-v${variant}.png`;
                            
                            logger.info(`Generating banner: ${fileName}`);
                            
                            // 배너 업데이트 시도
                            const success = await bannerUpdater.updateBanner(bannerType.type, fileName);
                            
                            // 결과 기록
                            results.details[`${bannerType.type}-${i}`] = {
                                success,
                                variant,
                                fileName
                            };
                            
                            if (!success) {
                                logger.warn(`Failed to generate banner: ${fileName}`);
                                results.success = false;
                            }
                        } catch (itemError) {
                            logger.error(`Error generating banner ${bannerType.type}-${i}:`, itemError);
                            results.details[`${bannerType.type}-${i}`] = {
                                success: false,
                                error: itemError.message
                            };
                            results.success = false;
                        }
                    }
                } catch (typeError) {
                    logger.error(`Error processing banner type ${bannerType.type}:`, typeError);
                    results.details[bannerType.type] = {
                        success: false,
                        error: typeError.message
                    };
                    results.success = false;
                }
            }
            
            logger.info(`Banner update process completed with ${results.success ? 'success' : 'some failures'}`);
            return results;
        } catch (error) {
            logger.error('Failed to update banners:', error);
            return {
                success: false,
                timestamp: new Date(),
                error: error.message
            };
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
            logger.warn('Scheduler is already running, skipping this run');
            return false;
        }
        
        this.isRunning = true;
        const startTime = new Date();
        this.lastRun = startTime;
        
        try {
            logger.info('Starting scheduled content update');
            
            // 각 태스크를 독립적으로 실행 (한 태스크의 실패가 다른 태스크 실행에 영향을 주지 않음)
            let contentGenSuccess = false;
            let bannerSuccess = false;
            let languageSuccess = false;
            
            // 1. 새 콘텐츠 생성
            try {
                logger.scheduler.start('New content generation');
                contentGenSuccess = await this.generateNewContent();
                logger.scheduler.complete('New content generation');
            } catch (contentError) {
                logger.scheduler.error('New content generation', contentError);
                logger.error('Content generation failed:', contentError);
            }
            
            // 2. 배너 이미지 업데이트
            try {
                logger.scheduler.start('Banner updates');
                bannerSuccess = await this.updateBanners();
                logger.scheduler.complete('Banner updates');
            } catch (bannerError) {
                logger.scheduler.error('Banner updates', bannerError);
                logger.error('Banner updates failed:', bannerError);
            }
            
            // 3. 다국어 콘텐츠 업데이트
            try {
                logger.scheduler.start('Language updates');
                languageSuccess = await this.updateLanguages();
                logger.scheduler.complete('Language updates');
            } catch (langError) {
                logger.scheduler.error('Language updates', langError);
                logger.error('Language updates failed:', langError);
            }
            
            // 다음 실행 시간 계산 및 상태 저장
            this.updateNextRunTime();
            
            // 종료 시간 및 소요 시간 기록
            const endTime = new Date();
            const duration = (endTime - startTime) / 1000; // 초 단위
            
            logger.info(`Scheduled update completed in ${duration} seconds`);
            
            // 전체 성공 여부 (모든 태스크가 성공해야 true)
            return contentGenSuccess && bannerSuccess && languageSuccess;
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
