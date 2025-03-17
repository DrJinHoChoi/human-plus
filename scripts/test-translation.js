/**
 * 번역 기능 테스트 스크립트
 * 
 * 사용법:
 * node scripts/test-translation.js [언어코드]
 * 
 * 예시:
 * node scripts/test-translation.js ko
 * node scripts/test-translation.js all
 */

const { translator } = require('../utils/translator');
const logger = require('../utils/logger');
require('dotenv').config();

// 테스트용 샘플 콘텐츠
const sampleContent = {
    "random-vision-text": "Advancing through continuous research<br>for a better future",
    "vision-card-random-text-1": "Global leader in electronic parts market",
    "vision-card-random-text-2": "Production focused on high-precision processing technology",
    "index-hero-random-description": "Human Plus<br>leads the way with<br>customer-centric technology and<br>detailed process management",
    "index-introduce-random-description": "Human Plus leads the way with <strong>global trust</strong>, <strong>customer-centric technology</strong>, and <strong>detailed process management</strong>"
};

/**
 * 단일 언어 번역 테스트
 * @param {string} targetLang - 대상 언어 코드
 */
async function testSingleLanguageTranslation(targetLang) {
    console.log(`\n===== ${targetLang.toUpperCase()} 번역 테스트 =====\n`);
    
    try {
        console.log('원본 콘텐츠:');
        console.log(JSON.stringify(sampleContent, null, 2));
        
        console.log('\n번역 중...\n');
        const translatedContent = await translator.translateContent(sampleContent, targetLang);
        
        console.log('번역 결과:');
        console.log(JSON.stringify(translatedContent, null, 2));
        
        console.log('\n✅ 번역 성공!');
    } catch (error) {
        console.error(`\n❌ 번역 실패: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

/**
 * 모든 지원 언어 번역 테스트
 */
async function testAllLanguagesTranslation() {
    console.log('\n===== 모든 언어 번역 테스트 =====\n');
    
    try {
        console.log('원본 콘텐츠:');
        console.log(JSON.stringify(sampleContent, null, 2));
        
        console.log('\n번역 중...\n');
        const translations = await translator.translateToMultipleLanguages(sampleContent);
        
        console.log('번역 결과:');
        for (const [lang, content] of translations.entries()) {
            console.log(`\n----- ${lang.toUpperCase()} -----`);
            console.log(JSON.stringify(content, null, 2));
        }
        
        console.log('\n✅ 모든 언어 번역 성공!');
    } catch (error) {
        console.error(`\n❌ 번역 실패: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

/**
 * 메인 함수
 */
async function main() {
    try {
        const targetLang = process.argv[2] || 'ko';
        
        if (targetLang === 'all') {
            await testAllLanguagesTranslation();
        } else {
            await testSingleLanguageTranslation(targetLang);
        }
    } catch (error) {
        console.error('테스트 실행 중 오류 발생:', error);
        process.exit(1);
    }
}

// 스크립트 실행
main().catch(console.error); 