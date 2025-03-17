const express = require('express');
const { LanguageUpdater } = require('../utils/languageUpdater');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

const langRouter = express.Router();
const languageUpdater = new LanguageUpdater();

/**
 * @route POST /api/lang/update
 * @description 언어 파일 수동 업데이트
 */
langRouter.post('/update', async (req, res) => {
    try {
        logger.api.request('POST', '/api/lang/update');
        
        const versions = [1, 2, 3, 4, 5, 6];
        const results = await Promise.all(
            versions.map(version => 
                languageUpdater.updateLanguageFile('en', version)
            )
        );

        logger.api.response('POST', '/api/lang/update', 200);
        res.status(200).json({
            success: true,
            message: 'Language files updated successfully',
            results
        });
    } catch (error) {
        logger.api.error('POST', '/api/lang/update', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update language files',
            error: error.message
        });
    }
});

/**
 * @route GET /api/lang/status
 * @description 언어 파일 업데이트 상태 확인
 */
langRouter.get('/status', async (req, res) => {
    try {
        logger.api.request('GET', '/api/lang/status');
        
        const status = await languageUpdater.getStatus();
        
        logger.api.response('GET', '/api/lang/status', 200);
        res.status(200).json({
            success: true,
            status
        });
    } catch (error) {
        logger.api.error('GET', '/api/lang/status', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get language status',
            error: error.message
        });
    }
});

// 랜덤 텍스트 파일 요청 처리
langRouter.get('/random', async (req, res) => {
    try {
        const { files } = req.query; // random-1,random-2 형식으로 받음
        const language = req.query.lang || 'ko'; // 기본 언어는 한국어
        
        const fileNames = files.split(',');
        const result = {};
        
        // basic.json 파일 먼저 로드 (기본 인터페이스 번역)
        try {
            const basicFilePath = path.join(__dirname, `../lang/${language}/basic.json`);
            const basicFileContent = await fs.readFile(basicFilePath, 'utf-8');
            Object.assign(result, JSON.parse(basicFileContent));
        } catch (basicError) {
            logger.warn(`Failed to load basic.json for ${language}: ${basicError.message}`);
            // basic.json 로드에 실패하면 영어 버전으로 시도
            if (language !== 'en') {
                try {
                    const enBasicFilePath = path.join(__dirname, '../lang/en/basic.json');
                    const enBasicFileContent = await fs.readFile(enBasicFilePath, 'utf-8');
                    Object.assign(result, JSON.parse(enBasicFileContent));
                } catch (fallbackError) {
                    logger.error(`Failed to load fallback basic.json: ${fallbackError.message}`);
                }
            }
        }
        
        // 랜덤 콘텐츠 파일 로드
        for (const fileName of fileNames) {
            const filePath = path.join(__dirname, `../lang/${language}/${fileName}.json`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            Object.assign(result, JSON.parse(fileContent));
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error loading random texts:', error);
        res.status(500).json({ 
            error: 'Failed to load random texts',
            details: error.message 
        });
    }
});

module.exports = langRouter;
