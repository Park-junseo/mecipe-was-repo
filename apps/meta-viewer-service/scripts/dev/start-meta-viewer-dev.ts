#!/usr/bin/env ts-node

/**
 * Meta Viewer Service 개발 환경 실행 스크립트
 * 
 * 기능:
 * 1. Testcontainers를 사용하여 Redis 컨테이너 실행
 * 2. PM2를 사용하여 meta-viewer-service 실행
 * 3. 환경 변수 자동 설정
 * 4. 정리 기능 (Ctrl+C 시 자동 정리)
 * 
 * 사용법:
 *   ts-node apps/meta-viewer-service/scripts/dev/start-meta-viewer-dev.ts
 *   또는
 *   pnpm tsx apps/meta-viewer-service/scripts/dev/start-meta-viewer-dev.ts
 */

// @ts-ignore - testcontainers 타입이 완전하지 않을 수 있음
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const META_VIEWER_SERVICE_NAME = 'meta-viewer-service';
const DEFAULT_SOCKET_PORT = 4100;
const DEFAULT_REDIS_PORT = 6379;

interface DevEnvironment {
  redisContainer: StartedTestContainer;
  redisUrl: string;
  socketPort: number;
}

/**
 * Redis 연결 테스트 - Redis가 완전히 준비될 때까지 대기
 * 여러 번 ping을 성공해야 실제로 준비된 것으로 간주
 */
async function waitForRedisReady(redisUrl: string, maxRetries = 60, delayMs = 1000): Promise<void> {
  const { createClient } = require('redis');
  
  console.log(`   Waiting for Redis to be fully ready...`);
  
  for (let i = 0; i < maxRetries; i++) {
    let testClient: any = null;
    try {
      testClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000, // 10초 연결 타임아웃
          reconnectStrategy: false, // 재연결 비활성화 (테스트용)
        },
      });
      
      // 에러 핸들러 추가 (처리되지 않은 에러 방지)
      testClient.on('error', () => {
        // 무시 (재시도할 예정)
      });
      
      // 연결 시도
      await testClient.connect();
      
      // 여러 번 ping을 성공해야 실제로 준비된 것으로 간주
      const pingRetries = 3;
      for (let j = 0; j < pingRetries; j++) {
        await testClient.ping();
        await new Promise((resolve) => setTimeout(resolve, 200)); // 각 ping 사이 짧은 대기
      }
      
      // SET/GET 테스트로 실제 동작 확인
      const testKey = `__test_${Date.now()}`;
      await testClient.set(testKey, 'test', { EX: 1 });
      const value = await testClient.get(testKey);
      if (value !== 'test') {
        throw new Error('Redis SET/GET test failed');
      }
      await testClient.del(testKey);
      
      await testClient.quit();
      console.log('✅ Redis is fully ready and accepting connections');
      return;
    } catch (error: any) {
      // 클라이언트가 생성되었으면 정리
      if (testClient) {
        try {
          if (testClient.isOpen) {
            await testClient.quit().catch(() => {});
          }
        } catch {
          // 무시
        }
        try {
          testClient.removeAllListeners();
        } catch {
          // 무시
        }
      }
      
      if (i < maxRetries - 1) {
        const errorMsg = error.code || error.message || 'Unknown error';
        if (i % 5 === 0 || i < 5) {
          // 처음 5번과 매 5번째마다만 로그 출력
          console.log(`   Waiting for Redis... (${i + 1}/${maxRetries}) - ${errorMsg}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw new Error(`Redis failed to become ready after ${maxRetries} attempts: ${error.message || error.code}`);
      }
    }
  }
}

/**
 * Redis 컨테이너 시작
 * Testcontainers의 자동 정리 방지 및 컨테이너 안정성 보장
 */
async function startRedisContainer(): Promise<StartedTestContainer> {
  console.log('🔴 Starting Redis container...');
  
  const container = new GenericContainer('redis:7.2-alpine')
    .withExposedPorts(DEFAULT_REDIS_PORT)
    .withCommand(['redis-server', '--appendonly', 'yes'])
    // 컨테이너가 종료되지 않도록 설정
    .withStartupTimeout(120000); // 2분 시작 타임아웃

  const startedContainer = await container.start();
  
  const host = startedContainer.getHost();
  const port = startedContainer.getMappedPort(DEFAULT_REDIS_PORT);
  const redisUrl = `redis://${host}:${port}`;
  const containerId = startedContainer.getId();
  
  console.log(`✅ Redis container started`);
  console.log(`   Container ID: ${containerId}`);
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   URL: ${redisUrl}`);
  console.log(`   Waiting for Redis to be ready...`);
  
  // Redis가 실제로 연결 가능할 때까지 대기
  await waitForRedisReady(redisUrl);
  
  // 컨테이너 상태 확인 (Docker 명령어 사용)
  try {
    const { execSync } = require('child_process');
    const dockerPsResult = execSync(`docker ps -q -f id=${containerId}`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    if (dockerPsResult) {
      console.log(`   ✅ Container is running (ID: ${containerId.substring(0, 12)})`);
    } else {
      console.warn(`   ⚠️  Container not found in docker ps (might be starting)`);
    }
  } catch (error: any) {
    // Docker 명령어 실패는 무시 (컨테이너는 정상 작동할 수 있음)
    console.log(`   ℹ️  Could not verify container status via docker command`);
  }
  
  return startedContainer;
}

/**
 * PM2 프로세스 중지 (명령어로)
 */
async function stopPm2Process(name: string): Promise<void> {
  const { execSync } = require('child_process');
  try {
    execSync(`pm2 stop ${name}`, { stdio: 'ignore' });
  } catch {
    // 프로세스가 없으면 무시
  }
}

/**
 * PM2 프로세스 삭제 (명령어로)
 */
async function deletePm2Process(name: string): Promise<void> {
  const { execSync } = require('child_process');
  try {
    execSync(`pm2 delete ${name}`, { stdio: 'ignore' });
  } catch {
    // 프로세스가 없으면 무시
  }
}

/**
 * package.json의 daemon 스크립트를 실행하여 Meta Viewer Service 시작
 */
async function startMetaViewerService(
  redisUrl: string,
  socketPort: number,
): Promise<void> {
  console.log('🚀 Starting meta-viewer-service with PM2 (via daemon script)...');
  
  // 서비스 루트 (apps/meta-viewer-service/scripts/dev -> ../..)
  const serviceRoot = path.resolve(__dirname, '../..');
  
  // 기존 프로세스 중지 및 삭제
  console.log(`   Checking for existing process: ${META_VIEWER_SERVICE_NAME}...`);
  await stopPm2Process(META_VIEWER_SERVICE_NAME);
  await deletePm2Process(META_VIEWER_SERVICE_NAME);
  
  // 환경 변수 설정
  const env = {
    ...process.env,
    REDIS_URL: redisUrl,
    SOCKET_PORT: socketPort.toString(),
    NODE_ENV: 'development',
    INSTANCE_ID: `dev-${Date.now()}`,
  };

  return new Promise((resolve, reject) => {
    // 프로젝트 루트 (apps/meta-viewer-service/scripts/dev -> ../../../..)
    // __dirname = apps/meta-viewer-service/scripts/dev
    // ../.. = apps/meta-viewer-service
    // ../../.. = apps
    // ../../../.. = 프로젝트 루트
    const projectRoot = path.resolve(__dirname, '../../../..');
    // 올바른 dist 경로
    const distPath = path.join(projectRoot, 'dist', 'apps', 'meta-viewer-service', 'main.js');
    
    // pnpm build 실행 후 pm2 start 실행
    const { execSync } = require('child_process');
    
    try {
      // 빌드 실행
      console.log('   Building...');
      execSync('pnpm build', {
        cwd: serviceRoot,
        env,
        stdio: 'inherit',
      });
      
      // 로그 디렉토리 생성
      const logsDir = path.join(serviceRoot, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // PM2 ecosystem 파일 생성 (환경 변수 포함)
      const ecosystemPath = path.join(serviceRoot, 'ecosystem.config.js');
      const envString = Object.entries(env)
        .map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
        .join(',\n');
      const ecosystemContent = `module.exports = {
  apps: [{
    name: ${JSON.stringify(META_VIEWER_SERVICE_NAME)},
    script: ${JSON.stringify(distPath)},
    instances: 3,
    watch: true,
    exec_mode: 'cluster',
    env: {
${envString}
    },
    // 클러스터 모드에서도 환경 변수가 전달되도록 보장
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: ${JSON.stringify(path.join(logsDir, 'meta-viewer-service-error.log'))},
    out_file: ${JSON.stringify(path.join(logsDir, 'meta-viewer-service-out.log'))},
    autorestart: true,
    max_memory_restart: '500M',
  }]
};
`;
      fs.writeFileSync(ecosystemPath, ecosystemContent);
      
      // 생성된 ecosystem 파일 내용 확인 (디버깅용)
      console.log(`   Created ecosystem file: ${ecosystemPath}`);
      console.log(`   Redis URL in env: ${env.REDIS_URL}`);
      
      // ecosystem 파일 내용 확인 (REDIS_URL 포함 여부)
      const ecosystemContentCheck = fs.readFileSync(ecosystemPath, 'utf-8');
      if (ecosystemContentCheck.includes('REDIS_URL')) {
        console.log('   ✅ REDIS_URL found in ecosystem file');
        // REDIS_URL 값 추출 (디버깅용)
        const redisUrlMatch = ecosystemContentCheck.match(/REDIS_URL["\s]*:["\s]*([^,}\n]+)/);
        if (redisUrlMatch) {
          console.log(`   Redis URL in ecosystem: ${redisUrlMatch[1]}`);
        }
      } else {
        console.error('   ❌ REDIS_URL NOT found in ecosystem file!');
        console.error('   Ecosystem file content:');
        console.error(ecosystemContentCheck);
      }
      
      // PM2 시작 (ecosystem 파일 사용)
      console.log('   Starting PM2...');
      console.log(`   Using ecosystem file: ${ecosystemPath}`);
      execSync(`pm2 start ${ecosystemPath}`, {
        cwd: projectRoot,
        env,
        stdio: 'inherit',
        shell: true,
      });
      
      // ecosystem 파일 삭제 (선택적 - 나중에 정리할 수 있음)
      // fs.unlinkSync(ecosystemPath);
      
      console.log(`✅ Meta Viewer Service started with PM2`);
      console.log(`   Name: ${META_VIEWER_SERVICE_NAME}`);
      console.log(`   Redis URL: ${redisUrl}`);
      console.log(`   Socket Port: ${socketPort}`);
      console.log(`   Logs: pm2 logs ${META_VIEWER_SERVICE_NAME}`);
      resolve();
    } catch (error: any) {
      reject(new Error(`Failed to start daemon: ${error.message}`));
    }
  });
}

/**
 * 정리 함수
 */
async function cleanup(env: DevEnvironment | null): Promise<void> {
  console.log('\n🧹 Cleaning up...');
  
  try {
    // PM2 프로세스 중지
    console.log(`   Stopping PM2 process: ${META_VIEWER_SERVICE_NAME}`);
    await stopPm2Process(META_VIEWER_SERVICE_NAME);
    await deletePm2Process(META_VIEWER_SERVICE_NAME);
    console.log('   ✅ PM2 process stopped');
  } catch (error: any) {
    if (!error.message?.includes('not found') && !error.message?.includes('not running')) {
      console.error('   ⚠️  Error stopping PM2 process:', error.message);
    }
  }
  
  try {
    // ecosystem 파일 삭제
    const serviceRoot = path.resolve(__dirname, '../..');
    const ecosystemPath = path.join(serviceRoot, 'ecosystem.config.js');
    if (fs.existsSync(ecosystemPath)) {
      fs.unlinkSync(ecosystemPath);
      console.log('   ✅ Ecosystem file removed');
    }
  } catch (error: any) {
    // 무시
  }
  
  try {
    // Redis 컨테이너 중지
    if (env?.redisContainer) {
      console.log('   Stopping Redis container...');
      await env.redisContainer.stop();
      console.log('   ✅ Redis container stopped');
    }
  } catch (error: any) {
    console.error('   ⚠️  Error stopping Redis container:', error.message);
  }
  
  console.log('✅ Cleanup completed');
}

/**
 * 메인 함수
 */
async function main() {
  let env: DevEnvironment | null = null;
  
  // Ctrl+C 처리
  const cleanupHandler = async () => {
    await cleanup(env);
    process.exit(0);
  };
  
  process.on('SIGINT', cleanupHandler);
  process.on('SIGTERM', cleanupHandler);
  
  // 예상치 못한 종료 방지
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    cleanup(env).finally(() => process.exit(1));
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    cleanup(env).finally(() => process.exit(1));
  });
  
  try {
    // 1. Redis 컨테이너 시작
    const redisContainer = await startRedisContainer();
    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(DEFAULT_REDIS_PORT)}`;
    
    // 2. Socket Port 설정 (환경 변수 또는 기본값)
    const socketPort = Number(process.env.SOCKET_PORT) || DEFAULT_SOCKET_PORT;
    
    env = {
      redisContainer,
      redisUrl,
      socketPort,
    };
    
    // 컨테이너 참조를 명시적으로 유지 (가비지 컬렉션 방지)
    // 전역 변수에 저장하여 참조 유지
    (global as any).__redisContainer = redisContainer;
    
    // 주기적으로 컨테이너 상태 확인 (5분마다)
    const healthCheckInterval = setInterval(async () => {
      try {
        const containerId = redisContainer.getId();
        const { execSync } = require('child_process');
        const result = execSync(`docker ps -q -f id=${containerId}`, { encoding: 'utf-8' }).trim();
        if (!result) {
          console.error('⚠️  Redis container disappeared! Container ID:', containerId);
          console.error('   This might be due to:');
          console.error('   1. Docker daemon restart');
          console.error('   2. Container crash');
          console.error('   3. Manual container removal');
          console.error('   4. System resource constraints');
          console.error('   Please check Docker logs: docker ps -a');
        }
      } catch (error: any) {
        // 무시 (컨테이너 확인 실패)
      }
    }, 5 * 60 * 1000); // 5분마다
    
    // 프로세스 종료 시 health check 정리
    process.on('exit', () => {
      clearInterval(healthCheckInterval);
    });
    
    // 3. Meta Viewer Service 시작
    await startMetaViewerService(redisUrl, socketPort);
    
    console.log('\n✅ Development environment is ready!');
    console.log(`   Redis Container ID: ${redisContainer.getId()}`);
    console.log('\n📋 Useful commands:');
    console.log(`   View logs: pm2 logs ${META_VIEWER_SERVICE_NAME}`);
    console.log(`   Stop service: pm2 stop ${META_VIEWER_SERVICE_NAME}`);
    console.log(`   Restart service: pm2 restart ${META_VIEWER_SERVICE_NAME}`);
    console.log(`   View status: pm2 status`);
    console.log(`   Check Redis container: docker ps -f id=${redisContainer.getId()}`);
    console.log(`   Redis logs: docker logs ${redisContainer.getId()}`);
    console.log('\n💡 Press Ctrl+C to stop all services\n');
    
    // 프로세스가 종료되지 않도록 대기
    await new Promise(() => {});
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await cleanup(env);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

