const axios = require('axios');

async function translateContent(content, targetLang) {
    try {
        // HTML 태그 보존
        const taggedContent = content.replace(
            /(<[^>]+>.*?<\/[^>]+>|<[^/>]+\/>)/g,
            match => `__TAG__${Buffer.from(match).toString('base64')}__TAG__`
        );
        
        // API 요청 (예: OpenAI API)
        const response = await axios.post(process.env.TRANSLATION_API_URL, {
            text: taggedContent,
            target_language: targetLang
        });
        
        // 태그 복원
        const translatedContent = response.data.replace(
            /__TAG__([A-Za-z0-9+/=]+)__TAG__/g,
            (_, encoded) => Buffer.from(encoded, 'base64').toString()
        );
        
        return translatedContent;
    } catch (error) {
        console.error('Translation failed:', error);
        throw error;
    }
}

const translationPrompt = `Role: 자동차 산업 전문 테크니컬 번역가

Task: 휴먼플러스(자동차 부품 제조 기업) 웹사이트 콘텐츠의 JSON 형식 번역

Guidelines:
1. 가장 중요한 규칙: 유효한 JSON 형식 유지
   - 결과물은 반드시 올바른 JSON 형식이어야 합니다 (파싱 가능해야 함)
   - 시작은 중괄호 { 로, 끝은 중괄호 } 로 정확히 끝나야 함
   - 모든 키와 값은 큰따옴표(")로 감싸야 함 (작은따옴표 사용 금지)
   - 마지막 항목을 제외한 모든 항목 뒤에는 콤마(,) 필수
   - 중괄호({})와 대괄호([])는 정확한 위치에 배치

2. 번역 규칙:
   - 키(key)는 절대 번역하지 말고 원문 그대로 유지
   - 값(value)만 타겟 언어로 번역
   - HTML 태그(<strong>, <br>, <span>)는 번역하지 말고 원문 그대로 유지
   - 회사명 'Human Plus', 'HUMAN PLUS'는 번역하지 않음
   - 기술 용어(SMT, PBA, CNC 등)는 원어 그대로 유지

3. HTML 태그 규칙:
   - HTML 태그의 위치와 구조는 원본과 동일하게 유지
   - 태그는 반드시 열고 닫아야 함
   - 허용된 태그만 사용: <strong>, <br>, <span>

4. 번역 품질:
   - 자동차 산업 전문 용어를 정확히 사용
   - 자연스러운 문장 구조와 표현으로 번역
   - 각 언어의 문법적 특성과 관용적 표현 활용

5. 출력 형식 검증:
   - 번역을 완료한 후, 전체 결과물이 유효한 JSON인지 반드시 확인
   - 모든 키와 값이 큰따옴표로 감싸져 있는지 확인
   - 콤마 위치가 정확한지 확인
   - 중괄호의 열고 닫기가 정확한지 확인
   - 큰따옴표 이스케이프 처리가 필요한 경우 \\\" 사용

입력 JSON 예시:
{
  "random-vision-text": "Advancing through continuous research<br>for a better future",
  "vision-card-random-text-1": "Global leader in electronic parts market",
  "technology-hero-random-description": "Setting manufacturing standards<br>through customer-centric innovation"
}

출력은 반드시 다음과 같은 형식이어야 합니다:
{
  "random-vision-text": "끊임없는 연구를 통해<br>더 나은 미래를 위해 발전합니다",
  "vision-card-random-text-1": "전자 부품 시장의 글로벌 리더",
  "technology-hero-random-description": "고객 중심 혁신과<br>정밀한 공정 관리를 통한<br>제조 표준 정립"
}`;

module.exports = translationPrompt; 