document.addEventListener("DOMContentLoaded", () => {
    const textElements = document.querySelectorAll("[data-i18n]");
    const maxFiles = 6; // 총 JSON 파일 개수 (1 ~ 6번 파일)
    const randomFileKey = "selectedJsonFile"; // sessionStorage 키 이름
    const languageKey = "selectedLanguage";
    const geoLocationKey = "geoLocation"; // 위치 정보 캐싱용
    const geoExpiryKey = "geoExpiry"; // 위치 정보 만료 시간 
    
    // 국가 코드와 언어 매핑
    const countryToLanguageMap = {
        // 기본 매핑
        'KR': 'ko',  // 한국
        'JP': 'ja',  // 일본
        'CN': 'zh',  // 중국
        'TW': 'zh',  // 대만
        'HK': 'zh',  // 홍콩
        'SG': 'en',  // 싱가포르
        'US': 'en',  // 미국
        'GB': 'en',  // 영국
        'CA': 'en',  // 캐나다
        'AU': 'en',  // 호주
        'NZ': 'en',  // 뉴질랜드
        'DE': 'de',  // 독일
        'AT': 'de',  // 오스트리아
        'CH': 'de',  // 스위스
        'FR': 'fr',  // 프랑스
        'BE': 'fr',  // 벨기에
        'LU': 'fr',  // 룩셈부르크
        // 필요한 매핑 추가
    };
    
    // 브라우저 언어 감지
    function getBrowserLanguage() {
        const lang = navigator.language.split("-")[0];
        // 지원하는 언어인지 확인
        return isSupportedLanguage(lang) ? lang : 'en';
    }
    
    // 지원하는 언어인지 확인
    function isSupportedLanguage(lang) {
        return ['ko', 'en', 'ja', 'zh', 'de', 'fr'].includes(lang);
    }

    // Load language preference from localStorage or use detection
    async function getPreferredLanguage() {
        // 1. 로컬 스토리지에 저장된 선호 언어 확인
        const savedLang = localStorage.getItem(languageKey);
        const isUserSelected = localStorage.getItem('langUserSelected') === 'true';
        
        if (savedLang && isSupportedLanguage(savedLang)) {
            // 사용자가 직접 선택한 언어인 경우
            if (isUserSelected) {
                return { lang: savedLang, isAutoDetected: false };
            }
            // 자동 감지된 언어인 경우
            return { lang: savedLang, isAutoDetected: true };
        }
        
        // 2. 위치 기반 언어 감지 시도
        try {
            const countryCode = await detectCountry();
            if (countryCode && countryToLanguageMap[countryCode]) {
                const detectedLang = countryToLanguageMap[countryCode];
                // 감지된 언어를 저장하되, 사용자가 직접 선택한 것과 구분하기 위해 별도 플래그 없이 저장
                localStorage.setItem(languageKey, detectedLang);
                localStorage.removeItem('langUserSelected'); // 자동 감지된 언어임을 표시
                return { lang: detectedLang, isAutoDetected: true };
            }
        } catch (error) {
            console.warn('Country detection failed:', error);
        }
        
        // 3. 브라우저 언어 사용
        const browserLang = getBrowserLanguage();
        localStorage.setItem(languageKey, browserLang);
        localStorage.removeItem('langUserSelected'); // 자동 감지된 언어임을 표시
        return { lang: browserLang, isAutoDetected: true };
    }
    
    // IP 기반 국가 감지 (캐싱 적용)
    async function detectCountry() {
        // 캐시된 위치 정보 확인
        const cachedLocation = localStorage.getItem(geoLocationKey);
        const expiry = localStorage.getItem(geoExpiryKey);
        
        // 캐시가 유효하면 사용
        if (cachedLocation && expiry && new Date().getTime() < parseInt(expiry)) {
            return cachedLocation;
        }
        
        try {
            // 무료 IP 위치 확인 API 사용 (외부 API 의존성, 체험 호출 한도 있음)
            const response = await fetch('https://ipapi.co/json/');
            
            if (!response.ok) {
                throw new Error(`IP API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 24시간 동안 유효한 캐시로 저장
            localStorage.setItem(geoLocationKey, data.country_code);
            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24시간
            localStorage.setItem(geoExpiryKey, expiryTime.toString());
            
            return data.country_code;
        } catch (error) {
            console.error('Failed to detect country:', error);
            return null;
        }
    }

    // Save language preference (사용자가 명시적으로 선택한 경우)
    function saveLanguagePreference(lang, isUserSelected = true) {
        if (isSupportedLanguage(lang)) {
            localStorage.setItem(languageKey, lang);
            // 사용자가 직접 선택한 경우 자동 감지 메시지 숨기기
            if (isUserSelected) {
                hideAutoDetectionMessage();
                // 사용자 선택 표시 저장
                localStorage.setItem('langUserSelected', 'true');
            }
        }
    }
    
    // 자동 감지 메시지 표시
    function showAutoDetectionMessage() {
        const messageEl = document.querySelector('.language-auto-detected');
        if (messageEl) {
            messageEl.classList.add('show');
            
            // 5초 후 자동으로 메시지 숨기기
            setTimeout(() => {
                messageEl.classList.remove('show');
            }, 5000);
        }
    }
    
    // 자동 감지 메시지 숨기기
    function hideAutoDetectionMessage() {
        const messageEl = document.querySelector('.language-auto-detected');
        if (messageEl) {
            messageEl.classList.remove('show');
        }
    }

    // Get random file number with persistence
    function getRandomFileNumber() {
        let fileNumber = sessionStorage.getItem(randomFileKey);
        if (!fileNumber) {
            fileNumber = Math.floor(Math.random() * maxFiles) + 1;
            sessionStorage.setItem(randomFileKey, fileNumber);
        }
        return fileNumber;
    }

    // Load language data with improved error handling and caching
    async function loadLanguage(language, selectedFileNumber) {
        try {
            const response = await fetch(`/api/lang/random?files=random-${selectedFileNumber}&lang=${language}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const translations = await response.json();
            
            textElements.forEach((element) => {
                const key = element.getAttribute("data-i18n");
                if (translations[key]) {
                    // innerHTML 사용하여 HTML 태그 보존
                    element.innerHTML = translations[key];
                }
            });
            
            // 언어 스위처 업데이트
            const langSwitcher = document.querySelector('.language-switcher');
            if (langSwitcher) {
                langSwitcher.value = language;
            }
            
            // 언어에 따른 이미지 업데이트
            updateImages(language);
            
        } catch (error) {
            console.error('Failed to load language:', error);
            // 영어로 폴백
            if (language !== 'en') {
                return loadLanguage('en', selectedFileNumber);
            }
        }
    }

    // Update images based on language
    function updateImages(language) {
        if (language !== 'ko') {
            const cncHistoryImg = document.querySelector('.cnc-history-img');
            const electronicsHistoryImg = document.querySelector('.electronics-history-img');
            if (cncHistoryImg) {
                cncHistoryImg.src = "resources/img/연혁-cnc-division-en.png";
            }
            if (electronicsHistoryImg) {
                electronicsHistoryImg.src = "resources/img/연혁-electronic-division-en.png";
            }
        }
    }

    // 비동기 초기화 함수
    async function initializeLanguage() {
        const selectedFileNumber = getRandomFileNumber();
        try {
            const preferredLanguage = await getPreferredLanguage();
            
            // Load initial language
            await loadLanguage(preferredLanguage.lang, selectedFileNumber);
            
            // Set up language switcher if it exists
            const langSwitcher = document.querySelector('.language-switcher');
            if (langSwitcher) {
                langSwitcher.value = preferredLanguage.lang;
                langSwitcher.addEventListener('change', async (e) => {
                    const newLang = e.target.value;
                    saveLanguagePreference(newLang, true); // 사용자가 직접 선택했음을 표시
                    await loadLanguage(newLang, selectedFileNumber);
                });
            }
            
            // 자동 감지된 언어인 경우 메시지 표시
            if (preferredLanguage.isAutoDetected) {
                showAutoDetectionMessage();
            }
        } catch (error) {
            console.error('Language initialization failed:', error);
            // 오류 발생 시 영어로 폴백
            await loadLanguage('en', selectedFileNumber);
        }
    }

    // 비동기 텍스트 삽입 함수
    async function insertRandomTexts() {
        try {
            const response = await fetch(`/api/lang/random?files=random-1,random-2,random-3,random-4,random-5,random-6`);
            const texts = await response.json();
            
            // HTML 요소에 텍스트 삽입
            Object.entries(texts).forEach(([key, value]) => {
                const elements = document.querySelectorAll(`[data-text="${key}"]`);
                elements.forEach(element => {
                    element.innerHTML = value; // innerHTML 사용하여 HTML 태그 보존
                });
            });
        } catch (error) {
            console.error('Failed to insert random texts:', error);
        }
    }
    
    // 페이지 로드 시 언어 초기화 실행
    initializeLanguage();
});
