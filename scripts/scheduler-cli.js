#!/usr/bin/env node

const { scheduler } = require('../utils/scheduler');
const logger = require('../utils/logger');
require('dotenv').config();

// 명령행 인수 파싱
const args = process.argv.slice(2);
const command = args[0];
const options = parseOptions(args.slice(1));

/**
 * 명령행 옵션 파싱
 */
function parseOptions(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            options[key] = value;
            if (value !== true) i++;
        }
    }
    return options;
}

/**
 * 도움말 출력
 */
function showHelp() {
    console.log(`
스케줄러 CLI 도구 사용법
========================

명령어:
  start      스케줄러 시작
  stop       스케줄러 중지
  run        콘텐츠 업데이트 수동 실행
  status     스케줄러 상태 조회

옵션:
  --schedule [표현식]  크론 일정 설정 (start 명령어와 함께 사용)
  --verbose           상세 정보 출력

예시:
  node scripts/scheduler-cli.js start --schedule "0 0 * * *"
  node scripts/scheduler-cli.js status --verbose
  node scripts/scheduler-cli.js run
  node scripts/scheduler-cli.js stop
    `);
}

/**
 * 스케줄러 상태 출력
 */
async function showStatus(verbose = false) {
    console.log('\n스케줄러 상태');
    console.log('==============');
    console.log(`현재 상태: ${scheduler.isRunning ? '실행 중' : '정지됨'}`);
    console.log(`현재 일정: ${scheduler.schedule}`);
    
    if (scheduler.lastRun) {
        console.log(`마지막 실행: ${scheduler.lastRun.toLocaleString()}`);
    } else {
        console.log('마지막 실행: 없음');
    }
    
    if (scheduler.nextRun) {
        console.log(`다음 예정 실행: ${scheduler.nextRun.toLocaleString()}`);
        
        const now = new Date();
        const waitTimeMs = Math.max(0, scheduler.nextRun - now);
        const hours = Math.floor(waitTimeMs / 3600000);
        const minutes = Math.floor((waitTimeMs % 3600000) / 60000);
        const seconds = Math.floor((waitTimeMs % 60000) / 1000);
        
        console.log(`남은 시간: ${hours}시간 ${minutes}분 ${seconds}초`);
    } else {
        console.log('다음 예정 실행: 없음');
    }
    
    if (verbose && scheduler.lastStatus) {
        console.log('\n마지막 실행 상세 정보:');
        console.log('-----------------------');
        
        const contentGen = scheduler.lastStatus.contentGeneration || {};
        const bannerUpdates = scheduler.lastStatus.bannerUpdates || {};
        const langUpdates = scheduler.lastStatus.languageUpdates || {};
        
        console.log(`콘텐츠 생성: ${contentGen.success ? '성공' : '실패'}`);
        if (contentGen.timestamp) {
            console.log(`  시간: ${new Date(contentGen.timestamp).toLocaleString()}`);
        }
        
        console.log(`배너 업데이트: ${bannerUpdates.success ? '성공' : '실패'}`);
        if (bannerUpdates.timestamp) {
            console.log(`  시간: ${new Date(bannerUpdates.timestamp).toLocaleString()}`);
        }
        
        console.log(`언어 업데이트: ${langUpdates.success ? '성공' : '실패'}`);
        if (langUpdates.timestamp) {
            console.log(`  시간: ${new Date(langUpdates.timestamp).toLocaleString()}`);
        }
    }
    
    console.log('');
}

// 명령어 처리
async function main() {
    try {
        switch (command) {
            case 'start':
                if (options.schedule) {
                    scheduler.schedule = options.schedule;
                }
                scheduler.start();
                console.log(`스케줄러가 '${scheduler.schedule}' 일정으로 시작되었습니다.`);
                console.log(`다음 실행: ${scheduler.nextRun.toLocaleString()}`);
                break;
                
            case 'stop':
                scheduler.stop();
                console.log('스케줄러가 중지되었습니다.');
                break;
                
            case 'run':
                console.log('콘텐츠 업데이트 실행 중...');
                await scheduler.runUpdates();
                console.log('콘텐츠 업데이트가 완료되었습니다.');
                break;
                
            case 'status':
                await showStatus(options.verbose);
                break;
                
            case 'help':
            case '--help':
            case '-h':
                showHelp();
                break;
                
            default:
                console.log('알 수 없는 명령어입니다. 도움말을 표시합니다.\n');
                showHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error('오류 발생:', error.message);
        process.exit(1);
    } finally {
        // 명령이 완료된 후 프로세스 종료 (run 명령어는 자체적으로 완료됨)
        if (command !== 'run') {
            process.exit(0);
        }
    }
}

// 스크립트 실행
main(); 