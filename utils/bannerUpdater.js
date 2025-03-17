const { generateImage } = require('./apiClient');
const fs = require('fs').promises;
const fsExtra = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const { getPrompt } = require('../prompts/imagePrompts');

class BannerUpdater {
    constructor() {
        this.bannerDir = path.join(__dirname, '../random-banner');
        this.bannerTypes = {
            'index-hero': {
                prefix: 'index-hero-',
                count: 3,
                variants: 4
            },
            'news-hero': {
                prefix: 'news-hero-',
                count: 1,
                variants: 4
            },
            'history-hero': {
                prefix: 'history-hero-',
                count: 1,
                variants: 4
            },
            'technology-hero': {
                prefix: 'technology-hero-',
                count: 1,
                variants: 5
            },
            'vision-card': {
                prefix: 'vision-card-',
                count: 4,
                variants: 5
            },
            'company-overview': {
                prefix: 'company-overview-',
                count: 3,
                variants: 4
            },
            'electronics': {
                prefix: 'electronics-',
                count: 1,
                variants: 4
            },
            'cnc': {
                prefix: 'cnc-',
                count: 1,
                variants: 4
            }
        };
    }

    async generateBannerPrompt(pageType) {
        const prompts = {
            main: "A modern, professional image showcasing automotive manufacturing technology with a focus on electronics and precision engineering. Style: Clean, corporate, high-tech.",
            news: "A dynamic composition representing automotive industry news and innovations. Style: Modern, journalistic, informative.",
            history: "A timeline-style visualization of automotive manufacturing evolution. Style: Historical, progressive, corporate.",
            technology: "Cutting-edge automotive manufacturing technology and robotics. Style: Technical, futuristic, precise.",
            vision: "Future of automotive manufacturing with AI and automation. Style: Visionary, innovative, bold.",
            company: "Modern automotive manufacturing facility interior. Style: Professional, industrial, clean.",
            electronics: "Advanced automotive electronics manufacturing. Style: Technical, detailed, modern.",
            cnc: "Precision CNC machining of automotive parts. Style: Industrial, technical, detailed."
        };

        return prompts[pageType] || "Professional automotive manufacturing image";
    }

    async ensureDirectoryExists() {
        try {
            await fs.access(this.bannerDir);
        } catch {
            await fs.mkdir(this.bannerDir, { recursive: true });
            logger.info(`Created banner directory: ${this.bannerDir}`);
        }
    }

    async updateBanner(pageType, targetFile) {
        try {
            await this.ensureDirectoryExists();
            
            const bannerConfig = this.bannerTypes[pageType];
            if (!bannerConfig) {
                throw new Error(`Invalid page type: ${pageType}`);
            }

            // 파일명 표준화 - 변형과 번호를 분리
            let bannerFileName = targetFile;
            let variant = 1; // 기본 변형
            
            // 기존 배너 백업 시도
            try {
                await this.backupBanner(targetFile);
            } catch (backupError) {
                // 백업 실패는 중요하지 않음 - 계속 진행
                logger.warn(`Banner backup failed for ${targetFile}: ${backupError.message}`);
            }

            // 개선된 프롬프트 생성 로직 사용
            let prompt;
            try {
                // imagePrompts.js의 getPrompt 함수 사용 시도
                prompt = getPrompt(pageType, variant);
                logger.info(`Using prompt from imagePrompts.js for ${pageType}`);
            } catch (promptError) {
                // getPrompt 함수 오류 시 기본 프롬프트로 폴백
                logger.warn(`Failed to get prompt from imagePrompts.js: ${promptError.message}. Using fallback.`);
                prompt = await this.generateBannerPrompt(pageType);
            }
            
            logger.info(`Generating image for ${pageType} with prompt: ${prompt.substring(0, 100)}...`);
            
            // 이미지 생성 시도 (최대 3회)
            let imageData = null;
            let attemptCount = 0;
            const maxAttempts = 3;
            
            while (attemptCount < maxAttempts && imageData === null) {
                attemptCount++;
                try {
                    // API 응답 타임아웃 증가
                    imageData = await generateImage(prompt);
                    logger.info(`Successfully generated image for ${pageType} on attempt ${attemptCount}`);
                    break;
                } catch (imageError) {
                    logger.error(`Image generation failed for ${pageType}, attempt ${attemptCount}: ${imageError.message}`);
                    
                    // 마지막 시도인 경우
                    if (attemptCount === maxAttempts) {
                        // 기존 이미지가 있으면 그대로 유지하고 완료로 표시
                        try {
                            const filePath = path.join(this.bannerDir, targetFile);
                            await fs.access(filePath);
                            logger.warn(`Keeping existing banner for ${pageType} after ${maxAttempts} failed attempts`);
                            return false; // 실패했지만 기존 이미지 유지
                        } catch {
                            // 기존 이미지도 없는 경우
                            throw new Error(`Failed to generate image for ${pageType} after ${maxAttempts} attempts: ${imageError.message}`);
                        }
                    }
                    
                    // 잠시 대기 후 재시도
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            // 이미지 데이터가 있으면 저장
            if (imageData) {
                // 표준화된 파일명으로 저장 (type-index-variant.png)
                const fileName = `${pageType}-${variant}.png`;
                const filePath = path.join(this.bannerDir, targetFile);
                
                await fs.writeFile(filePath, Buffer.from(imageData, 'base64'));
                await fs.chmod(filePath, 0o644);
                logger.info(`Updated banner image: ${filePath}`);
                return true;
            }
            
            return false;
        } catch (error) {
            logger.error(`Failed to update banner for ${pageType}:`, error);
            throw error;
        }
    }

    async getStatus() {
        try {
            const files = await fs.readdir(this.bannerDir);
            const stats = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(this.bannerDir, file);
                    const stat = await fs.stat(filePath);
                    return {
                        file,
                        lastModified: stat.mtime,
                        size: stat.size
                    };
                })
            );

            return {
                totalFiles: files.length,
                lastUpdate: Math.max(...stats.map(s => s.lastModified)),
                files: stats
            };
        } catch (error) {
            logger.error('Failed to get banner status:', error);
            throw error;
        }
    }

    // 백업 기능 개선
    async backupBanner(fileName) {
        try {
            // 파일명에서 '-undefined' 문자열 제거 (있는 경우)
            const cleanFileName = fileName.replace(/-undefined\.png$/, '.png')
                                         .replace(/-undefined\.png-undefined\.png$/, '.png');
            
            // 원본 파일이 실제로 존재하는지 확인
            const sourcePath = path.join(this.bannerDir, cleanFileName);
            
            try {
                // 파일 존재 여부 확인
                await fs.access(sourcePath);
            } catch (error) {
                // 파일이 없으면 백업 불필요 - 조용히 성공 반환
                logger.debug(`No original file found for backup: ${cleanFileName}`);
                return true;
            }
            
            const backupDir = path.join(this.bannerDir, 'backup');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${cleanFileName}.${timestamp}`);

            // 백업 디렉토리 생성 (없는 경우)
            await fs.mkdir(backupDir, { recursive: true });
            await fs.copyFile(sourcePath, backupPath);
            
            logger.info(`Created backup of banner: ${backupPath}`);
            return true;
        } catch (error) {
            logger.warn(`Failed to create backup for ${fileName}:`, error);
            // 백업 실패해도 계속 진행
            return false;
        }
    }
}

module.exports = {
    BannerUpdater
};
