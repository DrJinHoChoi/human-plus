# HumanPlus Content Generator (Alpha Release)

자동화된 콘텐츠 생성 및 관리 시스템으로, DALL-E 3를 활용한 이미지 생성, OpenAI를 활용한 텍스트 생성 및 번역 기능을 제공합니다.

## 주요 기능

- **자동 이미지 생성**: DALL-E 3를 사용하여 다양한 타입의 배너 및 비주얼 이미지 생성
  - Vision Cards
  - Company Overview
  - History Hero
  - CNC 관련 이미지
- **텍스트 생성**: OpenAI를 활용한 자동 텍스트 콘텐츠 생성
- **다국어 번역**: 생성된 텍스트의 자동 번역
- **자동 스케줄링**: 매일 자정에 자동으로 콘텐츠 업데이트
- **REST API**: 수동 실행 및 상태 확인을 위한 API 엔드포인트 제공

## 시작하기 (초보자용 가이드)

### 필수 요구사항

1. **Node.js 설치**
   - [Node.js 공식 웹사이트](https://nodejs.org/)에서 LTS 버전 다운로드
   - 설치 파일 실행 및 설치 완료
   - 설치 확인: 터미널(맥)/명령 프롬프트(윈도우)에서 다음 명령어 실행
     ```bash
     node --version  # v18.0.0 이상이면 OK
     ```

2. **OpenAI API 키 준비**
   - [OpenAI 웹사이트](https://platform.openai.com/) 가입
   - API 키 생성: API 섹션에서 "Create new secret key" 클릭
   - 생성된 키를 안전한 곳에 복사해두기

### 상세 설치 가이드

1. **프로젝트 다운로드**
   ```bash
   git clone https://github.com/derBlaumond/humanplus_page.git
   cd humanplus_page
   ```
   또는 GitHub에서 ZIP 파일로 다운로드 후 압축 해제

2. **터미널/명령 프롬프트 열기**
   - 맥: Finder에서 프로젝트 폴더 우클릭 → 서비스 → 새로운 터미널
   - 윈도우: 프로젝트 폴더에서 Shift + 우클릭 → PowerShell 창 열기

3. **필요한 패키지 설치**
   ```bash
   npm install
   ```
   - 설치가 완료될 때까지 기다리기 (약 1-2분 소요)

4. **API 키 설정**
   - 텍스트 에디터(메모장 등)로 .env 파일 열기
   - `OPENAI_API_KEY=your_api_key_here` 부분을 찾아
   - `your_api_key_here` 대신 복사해둔 OpenAI API 키 붙여넣기
   - 파일 저장

5. **서버 실행**
   ```bash
   npm start
   ```
   - "Server is running on http://localhost:3000" 메시지가 표시되면 성공

6. **웹 브라우저에서 확인**
   - Chrome, Firefox 등의 브라우저 열기
   - 주소창에 `http://localhost:3000` 입력
   - 서버가 정상적으로 실행 중이라면 웹페이지가 표시됨

### 문제 해결

- **'npm' is not recognized...** 에러 발생 시
  → Node.js를 다시 설치하고 터미널/명령 프롬프트를 재시작

- **모듈을 찾을 수 없다는 에러 발생 시**
  ```bash
  rm -rf node_modules
  npm install
  ```

- **포트 3000이 이미 사용 중이라는 에러 발생 시**
  - .env 파일에서 `PORT=3000`을 다른 번호(예: 3001)로 변경

## API 키 설정 안내

콘텐츠 생성을 시작하기 전에 반드시 OpenAI API 키를 설정해야 합니다:

1. **`.env` 파일 생성**
   ```bash
   # 맥/리눅스의 경우
   touch .env
   
   # 윈도우의 경우
   type nul > .env
   ```

2. **API 키 입력**
   - 생성된 `.env` 파일을 텍스트 에디터로 열기
   - 다음 내용을 복사하여 붙여넣기:
     ```
     # OpenAI API 설정
     OPENAI_API_KEY=your_api_key_here
     
     # 스케줄러 설정 (기본값: 매일 자정)
     UPDATE_SCHEDULE=0 0 * * *
     
     # 서버 설정
     PORT=3000
     
     # 출력 디렉토리 설정
     OUTPUT_DIR=random-banner
     ```
   - `your_api_key_here` 부분을 자신의 실제 OpenAI API 키로 교체
   - 파일 저장

3. **API 키 확인**
   - OpenAI API 키는 `sk-`로 시작하는 문자열입니다
   - API 키를 분실했거나 잊어버린 경우 OpenAI 웹사이트에서 새로 발급받아야 합니다
   - API 키는 절대로 GitHub 등에 공개되지 않도록 주의하세요

## 콘텐츠 생성 가이드

### 텍스트 콘텐츠 재생성

1. **텍스트 생성 실행**
   ```bash
   node scripts/generate-content.js
   ```
   - 실행 후 `lang/` 디렉토리에 새로운 텍스트 파일들이 생성됨
   - 기본적으로 한국어로 생성되며, 다른 언어는 자동 번역됨

2. **번역 실행 (선택사항)**
   ```bash
   node scripts/translate-content.js
   ```
   - 새로 생성된 텍스트를 다른 언어로 번역
   - 지원 언어: 영어, 일본어, 중국어, 독일어, 프랑스어

### 이미지 콘텐츠 재생성

1. **전체 이미지 생성**
   ```bash
   node scripts/generate-image.js
   ```
   - 모든 타입의 이미지를 한 번에 생성
   - 생성되는 이미지 타입:
     - `vision-card`: 비전 카드 이미지 (4개 시리즈)
     - `company-overview`: 회사 소개 이미지 (3개 시리즈)
     - `history-hero`: 연혁 페이지 히어로 이미지
     - `cnc`: CNC 관련 이미지

2. **특정 타입/시리즈만 생성**
   ```bash
   # 예: vision-card의 2번 시리즈만 생성
   node scripts/generate-image.js vision-card 2
   ```

3. **생성된 이미지 확인**
   - 모든 이미지는 `random-banner/` 디렉토리에 저장
   - 파일명 형식: `[type]-[series]-[number].png`
   - 예시 파일명:
     ```
     vision-card-1-1.png ~ vision-card-4-4.png
     company-overview-1-1.png ~ company-overview-3-4.png
     history-hero-1.png ~ history-hero-4.png
     cnc-1.png ~ cnc-4.png
     ```

### 자동 업데이트 설정

매일 자정에 모든 콘텐츠를 자동으로 업데이트하려면:

1. **스케줄러 상태 확인**
   ```bash
   curl http://localhost:3000/api/scheduler/status
   ```

2. **수동으로 업데이트 실행**
   ```bash
   curl -X POST http://localhost:3000/api/scheduler/run
   ```

3. **스케줄 변경 (선택사항)**
   - `.env` 파일에서 `UPDATE_SCHEDULE` 값 수정
   - 기본값: `"0 0 * * *"` (매일 자정)
   - cron 형식 사용 (분 시 일 월 요일)

## 프로젝트 구조

```
humanplus_page-main/
├── scripts/
│   ├── generate-image.js     # 이미지 생성
│   ├── generate-content.js   # 텍스트 생성
│   └── translate-content.js  # 번역
├── utils/
│   ├── scheduler.js         # 스케줄러
│   ├── bannerUpdater.js     # 배너 업데이트
│   ├── languageUpdater.js   # 언어 파일 업데이트
│   ├── apiClient.js         # OpenAI API 클라이언트
│   ├── openaiClient.js      # OpenAI 텍스트 생성
│   ├── retryHelper.js       # 재시도 로직
│   └── logger.js           # 로깅
├── routes/
│   ├── scheduler.js        # 스케줄러 API
│   ├── banner.js          # 배너 API
│   └── lang.js           # 언어 API
├── prompts/              # 프롬프트 템플릿
├── lang/                # 생성된 텍스트
└── random-banner/       # 생성된 이미지
```

## Alpha 릴리즈 노트

현재 버전은 알파 릴리즈로, 다음 기능들이 구현되어 있습니다:
- ✅ 기본 서버 구조
- ✅ 스케줄러 시스템
- ✅ DALL-E 3 이미지 생성
- ✅ REST API 엔드포인트
- ✅ 텍스트 생성 기능
- ✅ 자동 번역 기능

다음 기능들은 아직 개발 중입니다:
- ⏳ 테스트 커버리지 향상
- ⏳ 웹 인터페이스 개선
- ⏳ 에러 처리 강화

## 라이선스

ISC 