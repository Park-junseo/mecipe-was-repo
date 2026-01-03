#!/usr/bin/env ts-node
/**
 * Route Policy Export Script
 * 
 * 이 스크립트는 모든 컨트롤러에서 @Public() 및 @RequireRole() 데코레이터를 수집하여
 * route-policy.json 파일을 생성합니다.
 * 
 * 사용법:
 *   # 모든 서비스 통합 정책 생성
 *   npm run export:policy
 *   ts-node scripts/export-route-policy.ts
 * 
 *   # 특정 서비스만
 *   ts-node scripts/export-route-policy.ts --service place-api-service
 * 
 *   # 서비스별 개별 파일 생성
 *   ts-node scripts/export-route-policy.ts --separate
 * 
 *   # 통합 파일 생성 (기본값)
 *   ts-node scripts/export-route-policy.ts --merge
 */

import { exportPolicy } from '../libs/common/src/auth/export-policy';
import { RoutePoilcy } from '../libs/common/src/auth/authorization.guard';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 서비스 설정
interface ServiceConfig {
  name: string;
  modulePath: string;
  displayName: string;
}

// 서비스 목록 정의
const SERVICES: ServiceConfig[] = [
  {
    name: 'place-api-service',
    modulePath: '../apps/place-api-service/src/app.module',
    displayName: 'Place API Service',
  },
  // 다른 서비스 추가 예시:
  // {
  //   name: 'user-api-service',
  //   modulePath: '../apps/user-api-service/src/app.module',
  //   displayName: 'User API Service',
  // },
  // {
  //   name: 'meta-viewer-service',
  //   modulePath: '../apps/meta-viewer-service/src/app.module',
  //   displayName: 'Meta Viewer Service',
  // },
];

/**
 * 서비스 모듈 동적 로드
 */
async function loadServiceModule(modulePath: string): Promise<any> {
  try {
    // 상대 경로를 절대 경로로 변환
    const absolutePath = require.resolve(modulePath, {
      paths: [process.cwd()],
    });
    const module = await import(absolutePath);
    return module.AppModule || module.default;
  } catch (error) {
    throw new Error(
      `Failed to load module from ${modulePath}: ${error.message}`,
    );
  }
}

/**
 * 여러 정책 파일 병합
 */
function mergePolicyFiles(
  policyFiles: Array<{ service: string; path: string }>,
): Record<string, RoutePoilcy> {
  const merged: Record<string, RoutePoilcy> = {};

  for (const { service, path } of policyFiles) {
    if (!existsSync(path)) {
      console.warn(`⚠️  Policy file not found: ${path} (${service})`);
      continue;
    }

    try {
      const content = readFileSync(path, 'utf-8');
      const policies = JSON.parse(content) as Record<string, RoutePoilcy>;

      // 키 충돌 확인 및 병합
      Object.entries(policies).forEach(([key, value]) => {
        if (merged[key]) {
          console.warn(
            `⚠️  Route conflict: ${key} exists in multiple services. Using first occurrence.`,
          );
        } else {
          merged[key] = value;
        }
      });

      console.log(`✅ Merged ${Object.keys(policies).length} routes from ${service}`);
    } catch (error) {
      console.error(`❌ Failed to read policy file ${path}: ${error.message}`);
    }
  }

  return merged;
}

async function main() {
  const args = process.argv.slice(2);
  const separate = args.includes('--separate');
  const merge = args.includes('--merge') || (!separate && !args.includes('--service'));
  const serviceArg = args.find((arg) => arg.startsWith('--service='));
  const serviceName = serviceArg ? serviceArg.split('=')[1] : null;
  
  // 기본 출력 경로: api-gateway 내부 (권장)
  // 또는 프로젝트 루트 dist 사용 시: 'dist/route-policy.json'
  const defaultOutputPath = 'dist/apps/api-gateway/route-policy.json';
  const outputPath = args.find((arg) => !arg.startsWith('--')) || defaultOutputPath;

  console.log('🚀 Starting route policy export...\n');

  // 특정 서비스만 처리
  if (serviceName) {
    const service = SERVICES.find((s) => s.name === serviceName);
    if (!service) {
      console.error(`❌ Service not found: ${serviceName}`);
      console.error(`Available services: ${SERVICES.map((s) => s.name).join(', ')}`);
      process.exit(1);
    }

    console.log(`📦 Processing: ${service.displayName}`);
    try {
      const AppModule = await loadServiceModule(service.modulePath);
      await exportPolicy(AppModule, outputPath);
      console.log(`✅ Route policy exported to: ${outputPath}`);
      process.exit(0);
    } catch (error) {
      console.error(`❌ Failed to export route policy: ${error.message}`);
      process.exit(1);
    }
  }

    // 서비스별 개별 파일 생성
    if (separate) {
      console.log('📦 Exporting policies for each service separately...\n');
      const results: Array<{ service: string; path: string }> = [];

      for (const service of SERVICES) {
        try {
          console.log(`Processing: ${service.displayName}...`);
          const AppModule = await loadServiceModule(service.modulePath);
          const serviceOutputPath = join(
            'dist',
            'apps',
            'api-gateway',
            `route-policy-${service.name}.json`,
          );
          await exportPolicy(AppModule, serviceOutputPath);
          results.push({ service: service.name, path: serviceOutputPath });
          console.log(`✅ Exported: ${serviceOutputPath}\n`);
        } catch (error) {
          console.error(
            `❌ Failed to export policy for ${service.name}: ${error.message}\n`,
          );
        }
      }

    console.log(`\n✅ Exported ${results.length} policy files`);
    process.exit(0);
  }

  // 통합 정책 파일 생성 (기본값)
  if (merge) {
    console.log('📦 Exporting and merging policies from all services...\n');
    const policyFiles: Array<{ service: string; path: string }> = [];

    // 각 서비스별로 정책 파일 생성
    for (const service of SERVICES) {
      try {
        console.log(`Processing: ${service.displayName}...`);
        const AppModule = await loadServiceModule(service.modulePath);
        const tempPath = join('dist', 'apps', 'api-gateway', `.temp-route-policy-${service.name}.json`);
        await exportPolicy(AppModule, tempPath);
        policyFiles.push({ service: service.name, path: tempPath });
        console.log(`✅ Exported: ${tempPath}\n`);
      } catch (error) {
        console.error(
          `❌ Failed to export policy for ${service.name}: ${error.message}\n`,
        );
      }
    }

    // 정책 파일 병합
    console.log('🔀 Merging policies...');
    const mergedPolicies = mergePolicyFiles(policyFiles);

    // 통합 파일 저장
    const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    if (outputDir) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(
      outputPath,
      JSON.stringify(mergedPolicies, null, 2),
      'utf-8',
    );

    // 임시 파일 삭제
    const { unlinkSync } = require('fs');
    policyFiles.forEach(({ path }) => {
      try {
        unlinkSync(path);
      } catch (error) {
        // 무시
      }
    });

    console.log(`\n✅ Merged route policy exported to: ${outputPath}`);
    console.log(`📊 Total routes: ${Object.keys(mergedPolicies).length}`);
    process.exit(0);
  }
}

main();

