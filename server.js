const express = require('express');
const path = require('path');
const cors = require('cors');
const init = require('./scripts/init');
const { initializeScheduler } = require('./utils/scheduler');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './'))); // 정적 파일 제공

// 라우터 설정
const schedulerRouter = require('./routes/scheduler');
const langRouter = require('./routes/lang');
const bannerRouter = require('./routes/banner');

app.use('/api/scheduler', schedulerRouter);
app.use('/api/lang', langRouter);
app.use('/api/banner', bannerRouter);

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작 전 초기화
async function startServer() {
    try {
        // 필요한 디렉토리와 파일들 초기화
        await init();
        
        // 스케줄러 초기화
        initializeScheduler();
        console.log('Scheduler initialized successfully');
        
        // 서버 시작
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();