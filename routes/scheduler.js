const express = require('express');
const { scheduler } = require('../utils/scheduler');
const logger = require('../utils/logger');

const schedulerRouter = express.Router();

/**
 * @route POST /api/scheduler/run
 * @description 스케줄러 수동 실행
 */
schedulerRouter.post('/run', async (req, res) => {
    try {
        logger.api.request('POST', '/api/scheduler/run');
        
        if (scheduler.isRunning) {
            logger.api.response('POST', '/api/scheduler/run', 409);
            return res.status(409).json({
                success: false,
                message: 'Scheduler is already running'
            });
        }
        
        // 비동기로 업데이트 실행 (응답을 기다리지 않고 바로 반환)
        scheduler.runUpdates().catch(error => {
            logger.error('Background scheduler execution failed:', error);
        });
        
        logger.api.response('POST', '/api/scheduler/run', 202);
        res.status(202).json({
            success: true,
            message: 'Scheduler tasks started successfully',
            nextCheckTime: new Date(Date.now() + 60000).toISOString() // 1분 후 상태 확인
        });
    } catch (error) {
        logger.api.error('POST', '/api/scheduler/run', error);
        res.status(500).json({
            success: false,
            message: 'Failed to execute scheduler tasks',
            error: error.message
        });
    }
});

/**
 * @route GET /api/scheduler/status
 * @description 스케줄러 상태 확인
 */
schedulerRouter.get('/status', (req, res) => {
    try {
        logger.api.request('GET', '/api/scheduler/status');
        
        // 기본 상태 정보
        const status = {
            schedule: scheduler.schedule,
            lastRun: scheduler.lastRun,
            nextRun: scheduler.getNextRunTime(),
            isRunning: scheduler.isRunning,
            lastStatus: scheduler.lastStatus
        };
        
        // 현재 시간과 다음 실행 시간 사이의 대기 시간 계산 (밀리초)
        if (status.nextRun) {
            const now = new Date();
            const waitTimeMs = Math.max(0, status.nextRun - now);
            
            // 대기 시간을 사용자 친화적인 형식으로 변환
            const hours = Math.floor(waitTimeMs / 3600000);
            const minutes = Math.floor((waitTimeMs % 3600000) / 60000);
            const seconds = Math.floor((waitTimeMs % 60000) / 1000);
            
            status.timeUntilNextRun = {
                milliseconds: waitTimeMs,
                formatted: `${hours}시간 ${minutes}분 ${seconds}초`
            };
        }
        
        // 마지막 실행 이후 경과 시간 계산
        if (status.lastRun) {
            const now = new Date();
            const elapsedTimeMs = now - status.lastRun;
            
            const hours = Math.floor(elapsedTimeMs / 3600000);
            const minutes = Math.floor((elapsedTimeMs % 3600000) / 60000);
            const seconds = Math.floor((elapsedTimeMs % 60000) / 1000);
            
            status.timeSinceLastRun = {
                milliseconds: elapsedTimeMs,
                formatted: `${hours}시간 ${minutes}분 ${seconds}초`
            };
        }
        
        logger.api.response('GET', '/api/scheduler/status', 200);
        res.status(200).json({
            success: true,
            status
        });
    } catch (error) {
        logger.api.error('GET', '/api/scheduler/status', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get scheduler status',
            error: error.message
        });
    }
});

/**
 * @route POST /api/scheduler/stop
 * @description 스케줄러 중지
 */
schedulerRouter.post('/stop', (req, res) => {
    try {
        logger.api.request('POST', '/api/scheduler/stop');
        
        scheduler.stop();
        
        logger.api.response('POST', '/api/scheduler/stop', 200);
        res.status(200).json({
            success: true,
            message: 'Scheduler stopped successfully'
        });
    } catch (error) {
        logger.api.error('POST', '/api/scheduler/stop', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop scheduler',
            error: error.message
        });
    }
});

/**
 * @route POST /api/scheduler/start
 * @description 스케줄러 시작
 */
schedulerRouter.post('/start', (req, res) => {
    try {
        logger.api.request('POST', '/api/scheduler/start');
        
        // 옵션: 요청에서 새 스케줄 전달 가능
        if (req.body.schedule) {
            scheduler.schedule = req.body.schedule;
        }
        
        scheduler.start();
        
        logger.api.response('POST', '/api/scheduler/start', 200);
        res.status(200).json({
            success: true,
            message: 'Scheduler started successfully',
            schedule: scheduler.schedule,
            nextRun: scheduler.getNextRunTime()
        });
    } catch (error) {
        logger.api.error('POST', '/api/scheduler/start', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start scheduler',
            error: error.message
        });
    }
});

module.exports = schedulerRouter; 