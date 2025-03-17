/**
 * 번역 기능을 담당하는 유틸리티 모듈
 * 다양한 언어로의 번역 및 JSON 형식 검증 기능 제공
 */

const apiClient = require('./apiClient');
const logger = require('./logger');

class Translator {
    constructor() {
        this.supportedLanguages = ['en', 'ja', 'de', 'fr', 'ko', 'zh'];
        this.baseLanguage = 'en';
    }

    /**
     * 텍스트 콘텐츠를 대상 언어로 번역
     * @param {string|object} content - 번역할 콘텐츠 (문자열 또는 객체)
     * @param {string} targetLang - 대상 언어 코드
     * @returns {Promise<string|object>} - 번역된 콘텐츠
     */
    async translateContent(content, targetLang) {
        if (!this.supportedLanguages.includes(targetLang)) {
            throw new Error(`지원되지 않는 언어: ${targetLang}`);
        }

        // 기본 언어인 경우 번역 불필요
        if (targetLang === this.baseLanguage) {
            return content;
        }

        try {
            // 객체인 경우 JSON 문자열로 변환
            const contentToTranslate = typeof content === 'object' 
                ? JSON.stringify(content) 
                : content;

            // API 클라이언트를 통한 번역
            const translatedContent = await apiClient.translateText(contentToTranslate, targetLang);
            
            // 원본이 객체였다면 번역된 결과도 객체로 반환
            if (typeof content === 'object') {
                return this.parseAndValidateJson(translatedContent, targetLang);
            }
            
            return translatedContent;
        } catch (error) {
            logger.error(`번역 실패 (${targetLang}):`, error);
            throw error;
        }
    }

    /**
     * JSON 문자열을 파싱하고 유효성 검사
     * @param {string} jsonString - 파싱할 JSON 문자열
     * @param {string} targetLang - 대상 언어 코드 (로깅용)
     * @returns {object} - 파싱된 객체
     */
    parseAndValidateJson(jsonString, targetLang) {
        try {
            // 기본 정제
            let cleanedJson = jsonString.trim();
            
            // JSON 시작/끝 확인 및 수정
            if (!cleanedJson.startsWith('{')) {
                const startIndex = cleanedJson.indexOf('{');
                if (startIndex !== -1) {
                    cleanedJson = cleanedJson.substring(startIndex);
                } else {
                    throw new Error('JSON 시작 중괄호를 찾을 수 없습니다');
                }
            }
            
            if (!cleanedJson.endsWith('}')) {
                const endIndex = cleanedJson.lastIndexOf('}');
                if (endIndex !== -1) {
                    cleanedJson = cleanedJson.substring(0, endIndex + 1);
                } else {
                    throw new Error('JSON 종료 중괄호를 찾을 수 없습니다');
                }
            }
            
            // 중괄호 개수 확인
            const openBraces = (cleanedJson.match(/{/g) || []).length;
            const closeBraces = (cleanedJson.match(/}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                logger.warn(`${targetLang} 번역에서 중괄호 개수 불일치: 열기=${openBraces}, 닫기=${closeBraces}`);
                // 가장 바깥쪽 중괄호만 유지하는 정제 시도
                cleanedJson = '{' + cleanedJson.substring(1, cleanedJson.length - 1).replace(/{|}/g, '') + '}';
            }
            
            // 파싱 시도
            try {
                return JSON.parse(cleanedJson);
            } catch (parseError) {
                // 파싱 실패 시 추가 정제 시도
                logger.warn(`${targetLang} 번역 파싱 실패, 추가 정제 시도: ${parseError.message}`);
                
                // 따옴표 문제 해결 시도
                cleanedJson = cleanedJson.replace(/'/g, '"')
                                      .replace(/"/g, '"')
                                      .replace(/"/g, '"');
                
                // 콤마 문제 해결 시도
                cleanedJson = cleanedJson.replace(/,\s*}/g, '}');
                
                // 재시도
                return JSON.parse(cleanedJson);
            }
        } catch (error) {
            logger.error(`JSON 파싱 최종 실패 (${targetLang}):`, error);
            throw error;
        }
    }

    /**
     * 여러 언어로 동시에 번역
     * @param {object} content - 번역할 콘텐츠 객체
     * @param {Array<string>} languages - 번역할 언어 코드 배열
     * @returns {Promise<Map<string, object>>} - 언어별 번역 결과 맵
     */
    async translateToMultipleLanguages(content, languages = this.supportedLanguages) {
        const translations = new Map();
        translations.set(this.baseLanguage, content);
        
        const translationPromises = languages
            .filter(lang => lang !== this.baseLanguage)
            .map(async (targetLang) => {
                try {
                    const translatedContent = await this.translateContent(content, targetLang);
                    translations.set(targetLang, translatedContent);
                } catch (error) {
                    logger.error(`${targetLang} 번역 실패:`, error);
                    // 실패 시 기본 언어 콘텐츠로 대체
                    translations.set(targetLang, content);
                }
            });
        
        await Promise.all(translationPromises);
        return translations;
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
const translator = new Translator();

module.exports = {
    translator,
    translateContent: translator.translateContent.bind(translator),
    translateToMultipleLanguages: translator.translateToMultipleLanguages.bind(translator)
}; 