const apiClient = require('./apiClient');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { translateToMultipleLanguages } = require('./translator');

class LanguageUpdater {
    constructor() {
        this.langDir = path.join(__dirname, '../lang');
        this.supportedLanguages = ['en', 'ja', 'de', 'fr', 'ko', 'zh'];
        this.baseLanguage = 'en';
    }

    async generateRandomContent(version) {
        const templates = {
            1: {
                content: {
                    "random-vision-text": "더 나은 미래를 위해<br>끊임없이 연구하며 성장합니다.",
                    "vision-card-random-text-1": "글로벌 전장 시장의 선도주자",
                    "vision-card-random-text-2": "고정밀 가공기술 중심 설비 생산",
                    "vision-card-random-text-3": "글로벌 인증과 기술 혁신",
                    "vision-card-random-text-4": "세계 시장을 선도하는 파트너십"
                }
            },
            2: {
                content: {
                    "index-hero-title-random-keyword1": "Connect",
                    "index-hero-title-random-keyword2": "Global",
                    "index-hero-random-description": "Human Plus는<br>글로벌 신뢰를 바탕으로<br>고객 중심의 기술과 세밀한<br>공정 관리로 앞서 나갑니다"
                }
            },
            3: {
                content: {
                    "index-introduce-random-description": "Human Plus는 <strong>글로벌 신뢰</strong>를 바탕으로 <strong>고객 중심의 기술</strong>과 <strong>세밀한 공정 관리</strong>로 앞서 나갑니다",
                    "index-card-introduce-random-description": "자동차 부품 제조의 선도 기업,<br><span>HUMAN PLUS</span>는<br><strong>끊임없는 혁신</strong>과 <strong>품질 향상</strong>으로<br><strong>고객 신뢰</strong>를 얻고 있습니다"
                }
            },
            4: {
                content: {
                    "index-collaboration-random-description": "Human Plus는 <strong>세계적인 신뢰</strong>를 바탕으로 <strong>고객 중심의 기술</strong>과 <strong>철저한 공정 관리</strong>를 통해 <strong>선도적인 위치</strong>를 유지합니다.",
                    "technology-hero-random-description": "고객 중심의 기술 혁신과<br>정교한 공정 관리로<br>제조의 표준을 만들어갑니다<br>"
                }
            },
            5: {
                content: {
                    "news-highlight-random-description": "우리가 만드는 것은 단순한 부품이 아닙니다.<br>그것은 전 세계를 연결하는 신뢰의 연결고리입니다.<br>휴먼플러스는 글로벌 자동차 산업의 내일을 함께 설계합니다."
                }
            },
            6: {
                content: {
                    "history-content-random-title": "Human Plus is global Based on trust, <br>Leading with customer-oriented technology <br>and detailed process management"
                }
            }
        };

        // 해당 버전의 템플릿을 기반으로 새로운 콘텐츠 생성
        const template = templates[version];
        if (!template) {
            throw new Error(`Invalid version: ${version}`);
        }

        const generatedContent = await apiClient.generateText(JSON.stringify(template.content));
        return JSON.parse(generatedContent);
    }

    async ensureDirectoryExists(langCode) {
        const langPath = path.join(this.langDir, langCode);
        try {
            await fs.access(langPath);
        } catch {
            await fs.mkdir(langPath, { recursive: true });
            logger.info(`Created language directory: ${langPath}`);
        }
    }

    async updateLanguageFile(langCode, version) {
        try {
            // Ensure all language directories exist
            for (const lang of this.supportedLanguages) {
                await this.ensureDirectoryExists(lang);
            }
            
            logger.info(`Generating content for language: ${langCode}, version: ${version}`);
            
            // Generate base content in English
            const englishContent = await this.generateRandomContent(version);
            
            // 새로운 translator 모듈을 사용하여 모든 언어로 번역
            const translations = await translateToMultipleLanguages(englishContent, this.supportedLanguages);
            
            // Save all translations
            const savePromises = Array.from(translations.entries()).map(
                async ([lang, content]) => {
                    try {
                        // 저장 전 파일 콘텐츠 검증
                        const fileContent = JSON.stringify(content, null, 2);
                        
                        // 저장할 파일이 유효한 JSON인지 다시 확인
                        try {
                            JSON.parse(fileContent);
                        } catch (validateError) {
                            logger.error(`Invalid JSON content for ${lang}, version ${version}: ${validateError.message}`);
                            // 유효하지 않은 경우, 영어 콘텐츠 사용
                            content = translations.get('en');
                        }
                        
                        const filePath = path.join(this.langDir, lang, `random-${version}.json`);
                        
                        // 기존 파일이 있다면 백업
                        try {
                            await this.backupLanguageFile(lang, version);
                        } catch (backupError) {
                            // 백업 실패는 치명적 오류가 아님
                            logger.warn(`Failed to backup ${lang} file version ${version}: ${backupError.message}`);
                        }
                        
                        // 파일 저장
                        await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
                        await fs.chmod(filePath, 0o644);
                        logger.info(`Updated language file: ${filePath}`);
                    } catch (saveError) {
                        logger.error(`Failed to save language file for ${lang}, version ${version}: ${saveError.message}`);
                        // 하나의 파일 저장 실패가 전체 프로세스를 중단시키지 않도록 처리
                        // 다른 파일들은 계속 저장
                    }
                }
            );
            
            await Promise.all(savePromises);
            
            return {
                success: true,
                languages: Array.from(translations.keys())
            };
        } catch (error) {
            logger.error(`Failed to update language files for version ${version}:`, error);
            throw error;
        }
    }

    // 선택적: 이전 버전 백업
    async backupLanguageFile(langCode, version) {
        try {
            const sourcePath = path.join(this.langDir, langCode, `random-${version}.json`);
            const backupDir = path.join(this.langDir, 'backup', langCode);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `random-${version}.${timestamp}.json`);

            await fs.mkdir(backupDir, { recursive: true });
            await fs.copyFile(sourcePath, backupPath);
            
            logger.info(`Created backup of language file: ${backupPath}`);
        } catch (error) {
            logger.warn(`Failed to create backup for ${langCode}/random-${version}.json:`, error);
        }
    }

    // 선택적: JSON 유효성 검증
    async validateLanguageFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            JSON.parse(content); // JSON 형식 검증
            return true;
        } catch (error) {
            logger.error(`Language file validation failed for ${filePath}:`, error);
            throw error;
        }
    }
}

module.exports = {
    LanguageUpdater
};
