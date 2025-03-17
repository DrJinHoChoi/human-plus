프로젝트 분석 보고서

## 디렉토리 구조
.
./.git
./coverage
./lang
./lang/de
./lang/en
./lang/fr
./lang/ja
./lang/ko
./lang/zh
./logs
./node_modules
./prompts
./public
./public/js
./random-banner
./resources
./resources/fonts
./resources/icon
./resources/img
./routes
./scripts
./scripts/base
./scripts/component
./scripts/pages
./styles
./styles/base
./styles/component
./styles/pages
./tests
./utils

## 파일 종류별 통계

### JavaScript 파일
총 JS 파일 수: 32

### HTML 파일
총 HTML 파일 수: 6

### CSS 파일
총 CSS 파일 수: 17

## API 엔드포인트

- server.js:app.use('/api/scheduler', schedulerRouter);
- server.js:app.use('/api/lang', langRouter);
- server.js:app.use('/api/banner', bannerRouter);

## 의존성 분석

### 주요 외부 라이브러리
├── @types/jest@29.5.14
├── axios@1.7.9
├── cors@2.8.5
├── cron-parser@4.9.0
├── dotenv@16.4.7
├── express@4.21.2
├── fs-extra@11.3.0
├── jest@29.7.0
├── node-cron@3.0.3
├── openai@4.80.1
├── winston-daily-rotate-file@4.7.1
└── winston@3.17.0


## 핵심 기능
### OpenAI API 사용
- 이미지 생성 (DALL-E)
- 콘텐츠 생성 (GPT-4)
- 다국어 번역

### 스케줄러
- 콘텐츠 자동 업데이트
- 배너 이미지 교체
- 언어 파일 업데이트

## 테스트 상태
테스트 파일 목록:
./tests/openaiClient.test.js
./tests/setup.js

## 개발 환경 설정 방법

