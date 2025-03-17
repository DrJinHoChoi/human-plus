/**
 * 접속지 기반 언어 자동 설정 기능 테스트 스크립트
 * 
 * 사용법:
 * 1. 브라우저에서 웹사이트 접속
 * 2. 개발자 도구 열기 (F12 또는 Ctrl+Shift+I)
 * 3. 콘솔 탭에서 테스트 함수 실행
 * 
 * 예: testGeoDetection() 또는 testGeoDetection('US')
 */

// 테스트할 국가 코드와 예상되는 언어 매핑
const TEST_COUNTRY_MAPPINGS = {
    'KR': 'ko',  // 한국 -> 한국어
    'JP': 'ja',  // 일본 -> 일본어
    'CN': 'zh',  // 중국 -> 중국어
    'US': 'en',  // 미국 -> 영어
    'GB': 'en',  // 영국 -> 영어
    'DE': 'de',  // 독일 -> 독일어
    'FR': 'fr',  // 프랑스 -> 프랑스어
    'AU': 'en',  // 호주 -> 영어
    'SG': 'en',  // 싱가포르 -> 영어
    'XX': 'en'   // 알 수 없는 국가 -> 기본값(영어)
};

/**
 * IP 감지 API 호출을 모의(mock)하는 함수
 * @param {string} countryCode 테스트할 국가 코드
 * @returns {Promise} API 응답을 모방한 프로미스
 */
function mockIpApi(countryCode = 'KR') {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                country_code: countryCode,
                country_name: getCountryName(countryCode),
                ip: '192.168.1.1', // 가상 IP
                mocked: true
            });
        }, 100); // 네트워크 지연 시뮬레이션
    });
}

/**
 * 국가 코드에 해당하는 국가명 반환 (단순화)
 */
function getCountryName(code) {
    const countryNames = {
        'KR': '대한민국',
        'JP': '일본',
        'CN': '중국',
        'US': '미국',
        'GB': '영국',
        'DE': '독일',
        'FR': '프랑스',
        'AU': '호주',
        'SG': '싱가포르',
        'XX': '알 수 없는 국가'
    };
    return countryNames[code] || '알 수 없는 국가';
}

/**
 * localStorage 초기화 (테스트 전 상태 초기화)
 */
function resetLocalStorage() {
    localStorage.removeItem('selectedLanguage');
    localStorage.removeItem('langUserSelected');
    localStorage.removeItem('geoLocation');
    localStorage.removeItem('geoExpiry');
    console.log('✓ 로컬 스토리지 초기화 완료');
}

/**
 * IP 감지 API 호출 및 캐싱 테스트
 */
async function testIpDetection(mockCountry = null) {
    console.group('📍 IP 감지 API 테스트');
    
    try {
        // 1. 실제 API 호출 또는 모의 응답 사용
        let response;
        if (mockCountry) {
            console.log(`모의 국가 코드로 테스트: ${mockCountry}`);
            response = await mockIpApi(mockCountry);
        } else {
            console.log('실제 IP API 호출 중...');
            response = await fetch('https://ipapi.co/json/');
            response = await response.json();
        }
        
        // 2. 결과 출력
        console.log('감지된 국가:', response.country_code, response.country_name || '');
        console.log('예상되는 언어:', TEST_COUNTRY_MAPPINGS[response.country_code] || 'en');
        
        // 3. localStorage에 저장
        localStorage.setItem('geoLocation', response.country_code);
        const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24시간
        localStorage.setItem('geoExpiryKey', expiryTime.toString());
        
        console.log('✓ 캐싱 완료 (24시간)');
        console.log('테스트 완료');
        return response.country_code;
    } catch (error) {
        console.error('❌ IP 감지 실패:', error);
        return null;
    } finally {
        console.groupEnd();
    }
}

/**
 * 국가-언어 매핑 테스트
 */
function testLanguageMapping(countryCode) {
    console.group('🗣️ 국가-언어 매핑 테스트');
    
    try {
        const expectedLang = TEST_COUNTRY_MAPPINGS[countryCode] || 'en';
        console.log(`국가 코드: ${countryCode} → 예상 언어: ${expectedLang}`);
        
        // 원래 웹사이트의 매핑 테이블과 비교
        const countryToLanguageMap = {
            'KR': 'ko', 'JP': 'ja', 'CN': 'zh', 'TW': 'zh', 'HK': 'zh',
            'SG': 'en', 'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en',
            'NZ': 'en', 'DE': 'de', 'AT': 'de', 'CH': 'de', 'FR': 'fr',
            'BE': 'fr', 'LU': 'fr'
        };
        
        const actualLang = countryToLanguageMap[countryCode] || 'en';
        
        if (actualLang === expectedLang) {
            console.log('✓ 매핑 정확함');
        } else {
            console.warn(`❌ 매핑 불일치: 실제=${actualLang}, 예상=${expectedLang}`);
        }
        
        return actualLang;
    } catch (error) {
        console.error('❌ 매핑 테스트 실패:', error);
        return 'en';
    } finally {
        console.groupEnd();
    }
}

/**
 * 언어 선택 로직 테스트
 */
function testLanguageSelection(countryCode, languageCode) {
    console.group('🔄 언어 선택 로직 테스트');
    
    try {
        // 1. 사용자가 직접 선택한 경우
        console.log('시나리오 1: 사용자가 직접 언어 선택');
        localStorage.setItem('selectedLanguage', 'fr');
        localStorage.setItem('langUserSelected', 'true');
        
        let userSelected = localStorage.getItem('langUserSelected') === 'true';
        let savedLang = localStorage.getItem('selectedLanguage');
        
        console.log(`저장된 언어: ${savedLang}, 사용자 선택: ${userSelected}`);
        console.log(`예상 결과: 선택된 언어(fr) 사용, 자동 감지 메시지 숨김`);
        
        // 2. 자동 감지된 언어 사용
        console.log('\n시나리오 2: 자동 감지된 언어 사용');
        resetLocalStorage();
        
        localStorage.setItem('selectedLanguage', languageCode);
        // 'langUserSelected' 값은 설정하지 않음
        
        userSelected = localStorage.getItem('langUserSelected') === 'true';
        savedLang = localStorage.getItem('selectedLanguage');
        
        console.log(`국가: ${countryCode} → 감지된 언어: ${languageCode}`);
        console.log(`저장된 언어: ${savedLang}, 사용자 선택: ${userSelected}`);
        console.log(`예상 결과: 감지된 언어(${languageCode}) 사용, 자동 감지 메시지 표시`);
        
        // 3. 브라우저 설정 언어 사용 (감지 실패 시)
        console.log('\n시나리오 3: 브라우저 언어 사용 (IP 감지 실패 시)');
        resetLocalStorage();
        
        const browserLang = navigator.language.split('-')[0];
        console.log(`브라우저 언어: ${browserLang}`);
        console.log(`예상 결과: 브라우저 언어(${browserLang}) 사용, 자동 감지 메시지 표시`);
        
        console.log('✓ 테스트 완료');
    } catch (error) {
        console.error('❌ 언어 선택 테스트 실패:', error);
    } finally {
        console.groupEnd();
    }
}

/**
 * UI 표시 테스트
 */
function testUiElements() {
    console.group('🖥️ UI 요소 테스트');
    
    try {
        // 1. 언어 스위처 존재 확인
        const langSwitcher = document.querySelector('.language-switcher');
        console.log('언어 스위처 존재:', !!langSwitcher);
        
        // 2. 자동 감지 메시지 요소 확인
        const autoDetectMsg = document.querySelector('.language-auto-detected');
        console.log('자동 감지 메시지 요소 존재:', !!autoDetectMsg);
        
        // 3. 언어 컨테이너 확인
        const langContainer = document.querySelector('.language-container');
        console.log('언어 컨테이너 존재:', !!langContainer);
        
        // 4. 자동 감지 메시지 표시 테스트
        if (autoDetectMsg) {
            // 메시지 표시
            autoDetectMsg.classList.add('show');
            console.log('자동 감지 메시지 표시됨');
            
            // 5초 후 자동으로 사라짐
            setTimeout(() => {
                if (autoDetectMsg.classList.contains('show')) {
                    console.log('자동 감지 메시지가 5초 후에도 표시됨 (오류)');
                } else {
                    console.log('✓ 자동 감지 메시지 5초 후 사라짐 (정상)');
                }
            }, 5100);
        }
        
    } catch (error) {
        console.error('❌ UI 테스트 실패:', error);
    } finally {
        console.groupEnd();
    }
}

/**
 * 모든 테스트 실행
 * @param {string} mockCountry 테스트할 국가 코드 (생략 시 실제 IP 사용)
 */
async function testGeoDetection(mockCountry = null) {
    console.log('🔍 접속지 기반 언어 자동 설정 기능 테스트 시작');
    console.log('==========================================');
    
    // 초기 상태 저장
    const originalLang = localStorage.getItem('selectedLanguage');
    const originalUserSelected = localStorage.getItem('langUserSelected');
    
    // 테스트 전 초기화
    resetLocalStorage();
    
    // 1. IP 감지 테스트
    const detectedCountry = await testIpDetection(mockCountry);
    
    // 2. 국가-언어 매핑 테스트
    const mappedLanguage = testLanguageMapping(detectedCountry || 'XX');
    
    // 3. 언어 선택 로직 테스트
    testLanguageSelection(detectedCountry, mappedLanguage);
    
    // 4. UI 요소 테스트
    testUiElements();
    
    console.log('==========================================');
    console.log('🏁 테스트 완료');
    
    // 원래 상태로 복원
    if (originalLang) {
        localStorage.setItem('selectedLanguage', originalLang);
    }
    if (originalUserSelected) {
        localStorage.setItem('langUserSelected', originalUserSelected);
    }
    
    return {
        country: detectedCountry,
        language: mappedLanguage,
        browserLanguage: navigator.language,
        timestamp: new Date().toISOString()
    };
}

// 브라우저 콘솔에서 직접 실행 가능하도록 전역으로 노출
window.testGeoDetection = testGeoDetection;
window.resetLocalStorage = resetLocalStorage; 