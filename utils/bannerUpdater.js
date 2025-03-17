const apiClient = require('./apiClient');
const fs = require('fs').promises;
const fsExtra = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const { getPrompt } = require('../prompts/imagePrompts');

class BannerUpdater {
    constructor() {
        this.bannerDir = path.join(__dirname, '../random-banner');
        this.bannerTypes = {
            main: {
                prefix: 'index-hero-',
                count: 3,
                variants: 4
            },
            news: {
                prefix: 'news-hero-',
                count: 1,
                variants: 4
            },
            history: {
                prefix: 'history-hero-',
                count: 1,
                variants: 4
            },
            technology: {
                prefix: 'technology-hero-',
                count: 1,
                variants: 5
            },
            vision: {
                prefix: 'vision-card-',
                count: 4,
                variants: 5
            },
            company: {
                prefix: 'company-overview-',
                count: 3,
                variants: 4
            },
            electronics: {
                prefix: 'electronics-',
                count: 1,
                variants: 4
            },
            cnc: {
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

    async updateBanner(pageType, bannerFileName) {
        try {
            // 디버깅을 위한 로그 추가
            logger.info(`Updating banner: ${pageType}, file: ${bannerFileName}`);
            logger.info(`Directory check: ${this.bannerDir}`);
        
            // 디렉토리 존재 확인 및 생성
            await fsExtra.ensureDir(this.bannerDir);
        
            // 이미지 프롬프트 가져오기 및 로깅
            const prompt = getPrompt(pageType, 1);
            logger.info(`Image prompt: ${prompt.substring(0, 50)}...`);
        
            // 이미지 생성
            const base64Image = await apiClient.generateImage(prompt);
            logger.info(`Image generated successfully, size: ${base64Image ? base64Image.length : 0}`);
        
            // 파일 저장
            const filePath = path.join(this.bannerDir, bannerFileName);
            logger.info(`Saving to: ${filePath}`);
            await fs.writeFile(filePath, Buffer.from(base64Image, 'base64'));
        
            return true;
        } catch (error) {
            logger.error(`Failed to update banner ${pageType}:`, error);
            // 상세 오류 로깅
            if (error.response) {
                logger.error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            return {
                success: false,
                error: error.message
            };
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

    // Optional: Backup functionality
    async backupBanner(pageType, version) {
        try {
            const sourcePath = path.join(this.bannerDir, `${pageType}-${version}.png`);
            const backupDir = path.join(this.bannerDir, 'backup');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${pageType}-${version}.${timestamp}.png`);

            await fs.mkdir(backupDir, { recursive: true });
            await fs.copyFile(sourcePath, backupPath);
            
            logger.info(`Created backup of banner: ${backupPath}`);
        } catch (error) {
            logger.warn(`Failed to create backup for ${pageType}-${version}.png:`, error);
        }
    }
}

module.exports = {
    BannerUpdater
};
