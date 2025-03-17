const { scheduler, initializeScheduler } = require('../utils/scheduler');
const fs = require('fs').promises;
const path = require('path');

// 모의 모듈 (Mocks)
jest.mock('../utils/bannerUpdater', () => ({
    BannerUpdater: jest.fn().mockImplementation(() => ({
        bannerTypes: {
            main: { prefix: 'index-hero-', count: 3, variants: 4 },
            news: { prefix: 'news-hero-', count: 1, variants: 4 }
        },
        updateBanner: jest.fn().mockResolvedValue(true),
        getStatus: jest.fn().mockResolvedValue({
            totalFiles: 5,
            lastUpdate: new Date(),
            files: []
        })
    }))
}));

jest.mock('../utils/languageUpdater', () => ({
    LanguageUpdater: jest.fn().mockImplementation(() => ({
        supportedLanguages: ['en', 'ko', 'ja'],
        updateLanguageFile: jest.fn().mockResolvedValue({
            success: true,
            languages: ['en', 'ko', 'ja']
        })
    }))
}));

jest.mock('../utils/apiClient', () => ({
    checkAPIStatus: jest.fn().mockResolvedValue({
        success: true,
        models: 10,
        status: 200,
        message: 'API service is available'
    }),
    generateImage: jest.fn().mockResolvedValue('base64EncodedImageData'),
    generateText: jest.fn().mockResolvedValue('{"test":"value"}'),
    translateText: jest.fn().mockResolvedValue('{"test":"번역된 값"}')
}));

jest.mock('node-cron', () => ({
    schedule: jest.fn().mockReturnValue({
        stop: jest.fn()
    })
}));

jest.mock('cron-parser', () => ({
    parseExpression: jest.fn().mockReturnValue({
        next: jest.fn().mockReturnValue(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 1일 후
    })
}));

jest.mock('fs', () => ({
    promises: {
        access: jest.fn().mockRejectedValue({ code: 'ENOENT' }),
        mkdir: jest.fn().mockResolvedValue(undefined),
        writeFile: jest.fn().mockResolvedValue(undefined),
        readFile: jest.fn().mockRejectedValue({ code: 'ENOENT' })
    }
}));

// 테스트 전 스케줄러 상태 초기화
beforeEach(() => {
    jest.clearAllMocks();
    scheduler.schedule = '0 0 * * *';
    scheduler.lastRun = null;
    scheduler.nextRun = null;
    scheduler.isRunning = false;
    scheduler.lastStatus = {
        contentGeneration: { success: false, timestamp: null, details: {} },
        bannerUpdates: { success: false, timestamp: null, details: {} },
        languageUpdates: { success: false, timestamp: null, details: {} }
    };
});

describe('Scheduler', () => {
    test('initializeScheduler 함수가 스케줄러를 시작하고 true를 반환해야 함', () => {
        const result = initializeScheduler();
        expect(result).toBe(true);
    });

    test('스케줄러가 start 메서드를 호출하면 cronJob이 설정되어야 함', () => {
        scheduler.start();
        expect(require('node-cron').schedule).toHaveBeenCalledWith(
            scheduler.schedule,
            expect.any(Function)
        );
    });

    test('스케줄러가 stop 메서드를 호출하면 cronJob이 중지되어야 함', () => {
        // 먼저 시작
        scheduler.start();
        const mockCronJob = require('node-cron').schedule.mock.results[0].value;
        
        // 중지
        scheduler.stop();
        expect(mockCronJob.stop).toHaveBeenCalled();
    });

    test('runUpdates 메서드가 모든 업데이트 함수를 호출해야 함', async () => {
        // Spy 설정
        const generateNewContentSpy = jest.spyOn(scheduler, 'generateNewContent').mockResolvedValue(true);
        const updateBannersSpy = jest.spyOn(scheduler, 'updateBanners').mockResolvedValue(true);
        const updateLanguagesSpy = jest.spyOn(scheduler, 'updateLanguages').mockResolvedValue(true);
        const saveStatusSpy = jest.spyOn(scheduler, 'saveStatus').mockResolvedValue(undefined);
        
        // 실행
        await scheduler.runUpdates();
        
        // 검증
        expect(generateNewContentSpy).toHaveBeenCalled();
        expect(updateBannersSpy).toHaveBeenCalled();
        expect(updateLanguagesSpy).toHaveBeenCalled();
        expect(saveStatusSpy).toHaveBeenCalled();
        expect(scheduler.lastRun).not.toBeNull();
        expect(scheduler.isRunning).toBe(false);
    });

    test('이미 실행 중인 경우 runUpdates 메서드가 중복 실행되지 않아야 함', async () => {
        // 실행 중 상태로 설정
        scheduler.isRunning = true;
        
        // Spy 설정
        const generateNewContentSpy = jest.spyOn(scheduler, 'generateNewContent');
        
        // 실행
        await scheduler.runUpdates();
        
        // 검증 - 콘텐츠 생성 함수가 호출되지 않아야 함
        expect(generateNewContentSpy).not.toHaveBeenCalled();
    });

    test('updateNextRunTime 메서드가 다음 실행 시간을 올바르게 계산해야 함', () => {
        scheduler.updateNextRunTime();
        expect(scheduler.nextRun).toBeInstanceOf(Date);
        
        // 현재 시간보다 미래인지 확인
        expect(scheduler.nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    test('getNextRunTime 메서드가 nextRun 값을 반환해야 함', () => {
        const testDate = new Date();
        scheduler.nextRun = testDate;
        expect(scheduler.getNextRunTime()).toBe(testDate);
    });
}); 