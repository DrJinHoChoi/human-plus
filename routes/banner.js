const express = require('express');
const { BannerUpdater } = require('../utils/bannerUpdater');
const logger = require('../utils/logger');

const bannerRouter = express.Router();
const bannerUpdater = new BannerUpdater();

/**
 * @route POST /api/banner/update
 * @description 배너 이미지 수동 업데이트
 */
bannerRouter.post('/update', async (req, res) => {
    try {
        logger.api.request('POST', '/api/banner/update');
        
        const bannerTypes = ['banner-1.png', 'banner-2.png', 'banner-3.png', 'banner-4.png'];
        const pageTypes = ['index-hero', 'news-hero', 'history-hero', 'technology-hero'];
        
        const successResults = [];
        const failedResults = [];
        
        for (let i = 0; i < bannerTypes.length; i++) {
            try {
                logger.info(`Updating banner: ${pageTypes[i]} (${bannerTypes[i]})`);
                const result = await bannerUpdater.updateBanner(pageTypes[i], bannerTypes[i]);
                
                successResults.push({
                    pageType: pageTypes[i],
                    bannerFile: bannerTypes[i],
                    success: true
                });
            } catch (err) {
                logger.error(`Failed to update ${pageTypes[i]} banner:`, err);
                failedResults.push({
                    pageType: pageTypes[i],
                    bannerFile: bannerTypes[i],
                    success: false,
                    error: err.message
                });
            }
        }

        const allSuccess = failedResults.length === 0;
        
        logger.api.response('POST', '/api/banner/update', allSuccess ? 200 : 207);
        res.status(allSuccess ? 200 : 207).json({
            success: allSuccess,
            message: allSuccess 
                ? 'All banner images updated successfully' 
                : `${successResults.length} banner(s) updated, ${failedResults.length} failed`,
            successful: successResults,
            failed: failedResults
        });
    } catch (error) {
        logger.api.error('POST', '/api/banner/update', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update banner images',
            error: error.message
        });
    }
});

/**
 * @route GET /api/banner/status
 * @description 배너 업데이트 상태 확인
 */
bannerRouter.get('/status', async (req, res) => {
    try {
        logger.api.request('GET', '/api/banner/status');
        
        const status = await bannerUpdater.getStatus();
        
        logger.api.response('GET', '/api/banner/status', 200);
        res.status(200).json({
            success: true,
            status
        });
    } catch (error) {
        logger.api.error('GET', '/api/banner/status', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get banner status',
            error: error.message
        });
    }
});

/**
 * @route GET /api/banner/config
 * @description 배너 설정 정보 제공
 */
bannerRouter.get('/config', async (req, res) => {
    try {
        logger.api.request('GET', '/api/banner/config');
        
        const config = {
            main: {
                prefix: 'index-hero-',
                count: 3,
                variants: 4
            },
            news: {
                prefix: 'news-hero-',
                count: 1,
                variants: 4
            },
            history: {
                prefix: 'history-hero-',
                count: 1,
                variants: 4
            },
            technology: {
                prefix: 'technology-hero-',
                count: 1,
                variants: 5
            },
            vision: {
                prefix: 'vision-card-',
                count: 4,
                variants: 5
            },
            company: {
                prefix: 'company-overview-',
                count: 3,
                variants: 4
            },
            electronics: {
                prefix: 'electronics-',
                count: 1,
                variants: 4
            },
            cnc: {
                prefix: 'cnc-',
                count: 1,
                variants: 4
            }
        };
        
        logger.api.response('GET', '/api/banner/config', 200);
        res.status(200).json(config);
    } catch (error) {
        logger.api.error('GET', '/api/banner/config', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get banner configuration',
            error: error.message
        });
    }
});

module.exports = bannerRouter;
