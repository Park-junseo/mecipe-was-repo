// export-policy.ts
import 'reflect-metadata';
import { NestFactory, Reflector, ModuleRef, ModulesContainer } from '@nestjs/core';
import { ROLES_KEY, RoutePoilcy } from './authorization.guard';
import { DiscoveryService } from '@nestjs/core';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { writeFileSync, mkdirSync } from 'fs';
import { INestApplicationContext } from '@nestjs/common';
import { Controller } from '@nestjs/common';

/**
 * HTTP 메서드 매핑
 */
const HTTP_METHOD_MAP: Record<number, string> = {
  0: 'GET',
  1: 'POST',
  2: 'PUT',
  3: 'DELETE',
  4: 'PATCH',
  5: 'ALL',
  6: 'OPTIONS',
  7: 'HEAD',
};

/**
 * 컨트롤러 경로와 라우트 경로를 결합하여 전체 경로 생성
 */
function buildFullPath(
  controllerWrapper: any,
  routePath: string | string[],
): string {
  // 컨트롤러 경로 가져오기
  const controllerPath = Reflect.getMetadata('path', controllerWrapper.metatype);
  
  // routePath가 배열인 경우 첫 번째 요소 사용
  const path = Array.isArray(routePath) ? routePath[0] : routePath;
  
  // 경로 정규화
  const normalizedControllerPath = controllerPath ? `/${controllerPath.replace(/^\//, '')}` : '';
  const normalizedRoutePath = path ? `/${path.replace(/^\//, '')}` : '';
  
  // 전체 경로 결합
  const fullPath = `${normalizedControllerPath}${normalizedRoutePath}`;
  
  // 중복 슬래시 제거 및 정규화
  return fullPath.replace(/\/+/g, '/') || '/';
}

/**
 * 라우트 정책을 JSON 파일로 내보내기
 * @param appModule - NestJS 앱 모듈 클래스
 * @param outputPath - 출력 파일 경로 (기본값: 'dist/route-policy.json')
 */
export async function exportPolicy(
  appModule: any,
  outputPath: string = 'dist/route-policy.json',
): Promise<void> {
  // Prisma 연결을 건너뛰기 위한 환경 변수 설정
  // PrismaService의 onModuleInit에서 연결을 시도하지 않도록 함
  const originalSkipConnect = process.env['SKIP_PRISMA_CONNECT'];
  process.env['SKIP_PRISMA_CONNECT'] = 'true';
  
  // 앱 컨텍스트 생성
  // 정책 수집에는 데이터베이스 연결이 필요하지 않음
  let app: INestApplicationContext;
  try {
    app = await NestFactory.createApplicationContext(appModule, {
      logger: false, // 로거 비활성화 (스크립트 실행 시)
    });
    // 모듈 초기화 완료 (DiscoveryService 등 사용 가능하도록)
    await app.init();
  } catch (error: any) {
    // 환경 변수 복원
    if (originalSkipConnect !== undefined) {
      process.env['SKIP_TO_EXPORT_POLICY'] = originalSkipConnect;
    } else {
      delete process.env['SKIP_TO_EXPORT_POLICY'];
    }
    
    // 데이터베이스 연결 실패는 정책 수집에 영향을 주지 않음
    // 하지만 NestFactory가 실패하면 메타데이터에 접근할 수 없음
    if (error.message?.includes('database') || error.message?.includes('Can\'t reach')) {
      throw new Error(
        `Database connection failed. Please ensure the database is running or modify PrismaService to skip connection when SKIP_PRISMA_CONNECT=true. Original error: ${error.message}`
      );
    }
    throw error;
  }
  
  // 환경 변수 복원
  if (originalSkipConnect !== undefined) {
    process.env['SKIP_PRISMA_CONNECT'] = originalSkipConnect;
  } else {
    delete process.env['SKIP_PRISMA_CONNECT'];
  }

  try {
    // DiscoveryService는 @nestjs/core에서 제공되지만,
    // createApplicationContext에서는 직접 사용할 수 없을 수 있음
    // ModulesContainer를 통해 직접 인스턴스화
    const modulesContainer = app.get(ModulesContainer);
    const discovery = new DiscoveryService(modulesContainer);
    const scanner = new MetadataScanner();
    const reflector = app.get(Reflector);

    const policyMap: Record<string, RoutePoilcy> = {};

    // 모든 컨트롤러 순회
    for (const wrapper of discovery.getControllers()) {
      const instance = wrapper.instance;
      const prototype = Object.getPrototypeOf(instance);

      // 컨트롤러의 모든 메서드 스캔
      scanner.scanFromPrototype(instance, prototype, (methodName) => {
        const handler = prototype[methodName];

        // ROLES_KEY 메타데이터 확인
        const policy = reflector.get<RoutePoilcy>(ROLES_KEY, handler);
        
        // 정책이 없으면 스킵 (정책이 없는 라우트는 수집하지 않음)
        if (!policy) return;

        // 라우트 경로 가져오기
        const routePath = Reflect.getMetadata('path', handler);
        
        // HTTP 메서드 가져오기
        const requestMethod = Reflect.getMetadata('method', handler);

        // 경로나 메서드가 없으면 스킵
        if (!routePath && routePath !== '') return;
        if (requestMethod === undefined) return;

        // HTTP 메서드 문자열로 변환
        const method = HTTP_METHOD_MAP[requestMethod] || 'GET';
        
        // 전체 경로 생성
        const fullPath = buildFullPath(wrapper, routePath);

        // 정책 맵에 추가 (키: "METHOD /path", 값: 정책 객체)
        const key = `${method} ${fullPath}`;
        policyMap[key] = policy;
      });
    }

    // 출력 디렉토리 생성
    const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    if (outputDir) {
      mkdirSync(outputDir, { recursive: true });
    }

    // JSON 파일로 저장
    writeFileSync(
      outputPath,
      JSON.stringify(policyMap, null, 2),
      'utf-8',
    );

    console.log(`✅ Route policy exported to: ${outputPath}`);
    console.log(`📊 Total routes: ${Object.keys(policyMap).length}`);
  } finally {
    await app.close();
  }
}

/**
 * 스크립트로 직접 실행할 때 사용
 * 사용법: ts-node libs/common/src/auth/export-policy.ts
 */
if (require.main === module) {
  // 동적 import를 사용하여 앱 모듈 로드
  // 실제 사용 시 앱 모듈 경로를 지정해야 함
  console.error('❌ Please use exportPolicy() function with your AppModule');
  console.error('Example:');
  console.error('  import { AppModule } from "./app.module";');
  console.error('  import { exportPolicy } from "@virtualcafe/common";');
  console.error('  exportPolicy(AppModule, "dist/route-policy.json");');
  process.exit(1);
}
