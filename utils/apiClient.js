const axios = require('axios');
const { retryOperation } = require('./retryHelper');
const marketingPrompt = require('../prompts/marketing');
const translationPrompt = require('../prompts/translation');
const logger = require('./logger');
require('dotenv').config();

class ApiClient {
    constructor() {
        this.client = axios.create({
            baseURL: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async generateText(prompt, preserveTags = false) {
        try {
            const response = await retryOperation(async () => {
                return await this.client.post('/chat/completions', {
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: marketingPrompt
                    }, {
                        role: "user",
                        content: prompt
                    }],
                    temperature: 0.7
                });
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Text generation failed:', error);
            throw error;
        }
    }

    async translateText(text, targetLang) {
        try {
            const response = await retryOperation(async () => {
                return await this.client.post('/chat/completions', {
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: translationPrompt
                    }, {
                        role: "user",
                        content: text
                    }],
                    temperature: 0.3
                });
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Translation failed:', error);
            throw error;
        }
    }

    async generateImage(prompt) {
        try {
            const operation = async () => {
                const response = await this.client.post('/v1/images/generations', {
                    prompt,
                    n: 1,
                    size: '1024x1024',
                    response_format: 'b64_json'
                });
                return response.data.data[0].b64_json;
            };

            return await retryOperation(operation);
        } catch (error) {
            logger.error('Image generation failed:', error);
            throw error;
        }
    }
}

/**
 * API 상태 확인
 * @returns {Promise<Object>} API 상태 정보
 */
async function checkAPIStatus() {
    try {
        const endpoint = process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1';
        
        // 간단한 API 요청으로 상태 확인
        const response = await axios({
            method: 'get',
            url: `${endpoint}/models`,
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10초 타임아웃
        });
        
        // 정상 응답 확인
        if (response.status === 200 && response.data && response.data.data) {
            return {
                success: true,
                models: response.data.data.length,
                status: response.status,
                message: 'API service is available'
            };
        } else {
            return {
                success: false,
                status: response.status,
                message: 'API responded but with unexpected format'
            };
        }
    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 500,
            message: error.message,
            error: error
        };
    }
}

const apiClientInstance = new ApiClient();
module.exports = {
    generateText: apiClientInstance.generateText.bind(apiClientInstance),
    translateText: apiClientInstance.translateText.bind(apiClientInstance),
    generateImage: apiClientInstance.generateImage.bind(apiClientInstance),
    checkAPIStatus
};
