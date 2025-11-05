/**
 * 이미지 최적화 스크립트
 * PNG와 JPEG 이미지를 최적화하여 파일 크기 감소
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// 최적화 설정
const OPTIMIZATION_CONFIG = {
    png: {
        quality: 80,
        compressionLevel: 9,
        effort: 10
    },
    jpeg: {
        quality: 85,
        mozjpeg: true
    }
};

// 통계
const stats = {
    totalFiles: 0,
    optimizedFiles: 0,
    errors: 0,
    originalSize: 0,
    optimizedSize: 0
};

/**
 * 파일 크기를 MB로 변환
 */
function formatBytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

/**
 * 단일 이미지 최적화
 */
async function optimizeImage(filePath) {
    try {
        const fileStats = await fs.stat(filePath);
        const originalSize = fileStats.size;
        
        // 파일 크기가 100KB 미만이면 스킵
        if (originalSize < 100 * 1024) {
            console.log(`⏭️  Skipping ${path.basename(filePath)} (already small: ${formatBytes(originalSize)}MB)`);
            return;
        }

        stats.totalFiles++;
        stats.originalSize += originalSize;

        const ext = path.extname(filePath).toLowerCase();
        const tempPath = filePath + '.tmp';

        // 이미지 최적화
        if (ext === '.png') {
            await sharp(filePath)
                .png({
                    quality: OPTIMIZATION_CONFIG.png.quality,
                    compressionLevel: OPTIMIZATION_CONFIG.png.compressionLevel,
                    effort: OPTIMIZATION_CONFIG.png.effort
                })
                .toFile(tempPath);
        } else if (ext === '.jpg' || ext === '.jpeg') {
            await sharp(filePath)
                .jpeg({
                    quality: OPTIMIZATION_CONFIG.jpeg.quality,
                    mozjpeg: OPTIMIZATION_CONFIG.jpeg.mozjpeg
                })
                .toFile(tempPath);
        } else {
            console.log(`⏭️  Skipping ${path.basename(filePath)} (unsupported format)`);
            return;
        }

        // 최적화된 파일 크기 확인
        const optimizedStats = await fs.stat(tempPath);
        const optimizedSize = optimizedStats.size;

        // 최적화된 파일이 더 작으면 원본 대체
        if (optimizedSize < originalSize) {
            await fs.rename(tempPath, filePath);
            stats.optimizedFiles++;
            stats.optimizedSize += optimizedSize;

            const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
            console.log(`✅ ${path.basename(filePath)}: ${formatBytes(originalSize)}MB → ${formatBytes(optimizedSize)}MB (${reduction}% 감소)`);
        } else {
            // 최적화된 파일이 더 크면 원본 유지
            await fs.unlink(tempPath);
            stats.optimizedSize += originalSize;
            console.log(`⚠️  ${path.basename(filePath)}: 최적화 효과 없음 (원본 유지)`);
        }
    } catch (error) {
        stats.errors++;
        console.error(`❌ Error optimizing ${filePath}:`, error.message);
        
        // 임시 파일 삭제
        try {
            await fs.unlink(filePath + '.tmp');
        } catch (e) {
            // Ignore
        }
    }
}

/**
 * 디렉토리의 모든 이미지 최적화
 */
async function optimizeDirectory(dirPath) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await optimizeDirectory(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                    await optimizeImage(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error reading directory ${dirPath}:`, error.message);
    }
}

/**
 * 메인 함수
 */
async function main() {
    console.log('🎨 이미지 최적화 시작...\n');
    console.log('⚙️  설정:');
    console.log(`   - PNG 품질: ${OPTIMIZATION_CONFIG.png.quality}`);
    console.log(`   - JPEG 품질: ${OPTIMIZATION_CONFIG.jpeg.quality}`);
    console.log(`   - 최소 크기: 100KB 이상만 최적화\n`);

    const startTime = Date.now();

    // 최적화할 디렉토리 목록
    const directories = [
        './random-banner',
        './resources/img'
    ];

    for (const dir of directories) {
        console.log(`\n📁 ${dir} 최적화 중...\n`);
        await optimizeDirectory(dir);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // 최종 통계
    console.log('\n' + '='.repeat(60));
    console.log('📊 최적화 완료 요약\n');
    console.log(`✅ 최적화된 파일: ${stats.optimizedFiles} / ${stats.totalFiles}`);
    console.log(`❌ 오류: ${stats.errors}`);
    console.log(`\n💾 용량 변화:`);
    console.log(`   원본: ${formatBytes(stats.originalSize)}MB`);
    console.log(`   최적화: ${formatBytes(stats.optimizedSize)}MB`);
    console.log(`   절감: ${formatBytes(stats.originalSize - stats.optimizedSize)}MB (${((1 - stats.optimizedSize / stats.originalSize) * 100).toFixed(1)}%)`);
    console.log(`\n⏱️  소요 시간: ${duration}초`);
    console.log('='.repeat(60) + '\n');
}

// 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { optimizeImage, optimizeDirectory };

