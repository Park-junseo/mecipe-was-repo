// scripts/test-db-setup.ts

/**
 * npm run start:test-- --start-app
 * nestjs 앱 실행
 * 
 * npm run start:test-db -- --start-app --start-prisma-studio
 * nestjs 앱 실행하고 prisma studio 실행
 * 
 * npm run start:test-db -- --seed:cafeinfo-big-data:100
 * cafeinfo-big-data 시딩 100개
 * 
 * npm run start:test-db -- --seed:cafeinfo-big-data:100 --start-app --start-prisma-studio
 * cafeinfo-big-data 시딩 100개하고 nestjs 앱 실행하고 prisma studio 실행
 */

import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { ChildProcess, exec as _exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const exec = promisify(_exec);

let dbContainer: StartedTestContainer | undefined;
let studioProcess: ChildProcess | undefined;
let isStartCleanUp: boolean = false;

async function startPrismaStudio(connectionString: string, isWindows: boolean = process.platform === 'win32') {
  console.log('🚀 Starting Prisma Studio...');
  const prismaCliPath = isWindows
    ? path.resolve(process.cwd(), './node_modules/.bin/prisma.cmd')
    : path.resolve(process.cwd(), './node_modules/.bin/prisma');
  studioProcess = spawn(prismaCliPath, ['studio', '--browser', 'true'], {
    env: {
      DATABASE_URL: connectionString,
    },
    stdio: 'inherit',
    shell: isWindows,
    cwd: path.resolve(process.cwd()),
  });
  console.log('✅ Prisma Studio started.');

  studioProcess.on('message', (message) => {
    console.log('✅ Prisma Studio message:', message);
  });
  studioProcess.on('error', (error) => {
    console.error('❌ Failed to start Prisma Studio:', error);
  });
  studioProcess.on('close', (code) => {
    console.log('✅ Prisma Studio exited with code:', code);
  });

  return studioProcess;
}

async function setupTestDatabase() {
  // 1. PostgreSQL 컨테이너 시작
  console.log('✨ Starting PostgreSQL container...');
  dbContainer = await new GenericContainer('debezium/postgres:16-alpine')
    .withNetworkAliases('test-total-db')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: 'testuser',
      POSTGRES_PASSWORD: 'testpassword',
      POSTGRES_DB: 'testdb',
    })
    // 스키마 파일 복사는 필요하지 않을 수 있음 (로컬에서 migrate 실행)
    // .withCopyFilesToContainer([
    //   { source: path.resolve(process.cwd(), './prisma/schema.prisma'), target: '/prisma/schema.prisma' },
    // ])
    .start();

  const host = dbContainer.getHost();
  const port = dbContainer.getMappedPort(5432);
  const connectionString = `postgresql://testuser:testpassword@${host}:${port}/testdb`;
  process.env.DATABASE_URL = connectionString; // ✨ NestJS 앱이 이 변수를 읽도록 설정!

  console.log(`🚀 Database ready at ${connectionString}`);

  // 2. Prisma Migrate (스키마 적용)
  console.log('📦 Applying Prisma migrations...');
  try {
    // 컨테이너 내부에서 prisma migrate deploy 실행 (컨테이너 내에 prisma CLI가 없으므로 로컬에서 실행)
    // 또는 PrismaClient를 통해 $executeRaw를 이용하여 스키마 생성 가능
    // Windows와 Unix 모두에서 작동하도록 경로 처리
    const isWindows = process.platform === 'win32';
    const prismaCliPath = isWindows
      ? path.resolve(process.cwd(), './node_modules/.bin/prisma.cmd')
      : path.resolve(process.cwd(), './node_modules/.bin/prisma');
    const schemaPath = path.resolve(process.cwd(), './prisma/schema.prisma'); // 스키마 파일 경로

    const execOptions: any = {
      env: { ...process.env, DATABASE_URL: connectionString }
    };

    if (isWindows) {
      execOptions.shell = true;
    }

    await exec(`"${prismaCliPath}" migrate deploy --schema="${schemaPath}"`, execOptions);
    console.log('✅ Prisma migrations applied.');
  } catch (error) {
    console.error('❌ Failed to apply Prisma migrations:', error.stderr || error);
    await teardownTestDatabase();
    process.exit(1);
  }

  // (선택 사항) 초기 데이터 시딩
  // await exec(`ts-node ./scripts/seed-data.ts`, {
  //   env: { ...process.env, DATABASE_URL: connectionString }
  // });
  // console.log('✅ Test data seeded.');

  // 컨테이너 정보를 반환하여 다른 곳에서 사용할 수 있게 함 (ex: 종료 시)
  return {
    dbContainer,
    connectionString,
  };
}

async function stopPrismaStudio() {
  if (studioProcess && studioProcess.pid) {
    console.log('🧹 Stopping Prisma Studio...');
    studioProcess.kill(0);
    console.log('🗑️ Prisma Studio stopped.');
  }
}

async function teardownTestDatabase() {
  if (dbContainer) {
    console.log('🧹 Stopping PostgreSQL container...');
    await dbContainer.stop();
    console.log('🗑️ PostgreSQL container stopped.');
  }
}

async function seedTestDatabase(connectionString: string, argv: string[], isWindows: boolean = process.platform === 'win32') {

  // NestJS 앱이 어느 정도 시작될 때까지 기다리는 로직 (선택 사항, 필요하다면)
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10초 대기

  // 3. 시딩 스크립트 실행
  const tsNodePath = isWindows
    ? path.resolve(process.cwd(), './node_modules/.bin/ts-node.cmd')
    : path.resolve(process.cwd(), './node_modules/.bin/ts-node');
  const seedScriptPath = path.resolve(process.cwd(), './scripts/prisma/seed.dev/index.ts');

  console.log('🌱 Starting seeding script...', connectionString);

  // 시딩 스크립트가 시작될 때도 DATABASE_URL을 명시적으로 전달
  const seedProcess = spawn(tsNodePath, ['-r', 'tsconfig-paths/register', './scripts/prisma/seed.dev/index.ts', connectionString, ...argv], {
    stdio: 'inherit',
    shell: isWindows,
    cwd: path.resolve(process.cwd()),
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  await new Promise((resolve, reject) => {
    seedProcess.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Seeding failed with code ${code}`));
      }
    });
    seedProcess.on('error', (err) => reject(err));
  });
  console.log('✅ Seeding script finished.');
}

async function cleanUp(code: number = 0) {
  if (isStartCleanUp) {
    console.log('🧹 Clean up already started. Skipping... code: ', code);
    return;
  }
  isStartCleanUp = true;
  console.log('🧹 Cleaning up...');
  await stopPrismaStudio();
  await teardownTestDatabase();
  process.exit(code || 0);
}


// 스크립트가 직접 실행될 때 setup 함수를 호출하고, 종료 시 teardown 함수를 호출하도록 설정
if (require.main === module) {
  const shouldStartApp = process.argv.includes('--start-app');
  const shouldStartAppWithWatch = process.argv.includes('--watch');
  const shouldStartPrismaStudio = process.argv.includes('--start-prisma-studio');

  setupTestDatabase()
    .then(async ({ dbContainer, connectionString }) => {
      console.log('✅ Test database setup completed successfully!');

      const isWindows = process.platform === 'win32';

      if (shouldStartPrismaStudio) {
        try {
          await startPrismaStudio(connectionString, isWindows);
        } catch (error) {
          console.error('❌ Failed to start Prisma Studio:', error);
        }
      }

      if (shouldStartApp) {
        console.log('🚀 Starting NestJS application...');
        const nestCliPath = isWindows
          ? path.resolve(process.cwd(), './node_modules/.bin/nest.cmd')
          : path.resolve(process.cwd(), './node_modules/.bin/nest');

        // NestJS 앱을 spawn으로 시작 (환경변수는 이미 process.env에 설정됨)
        const nestProcess = spawn(nestCliPath, ['start', shouldStartAppWithWatch ? '--watch' : ''], {
          env: process.env,
          shell: isWindows,
          stdio: 'inherit', // 부모 프로세스의 stdio를 상속
          cwd: path.resolve(process.cwd()),
        });

        // NestJS 앱이 종료되면 컨테이너도 종료
        nestProcess.on('exit', async (code) => {
          await stopPrismaStudio();
          await teardownTestDatabase();
          process.exit(String(code) || 0);
        });

        nestProcess.on('error', async (error) => {
          console.error('❌ Failed to start NestJS application:', error);
          cleanUp(1);
        });

      } else {
        // 앱을 시작하지 않으면 프로세스를 유지 (컨테이너가 계속 실행되도록)
        console.log('💡 Database container is running. Press Ctrl+C to stop.');
      }

      try {
        await seedTestDatabase(connectionString, process.argv.slice(2));
      } catch (error) {
        console.error('❌ Failed to seed test database:', error);
        throw new Error('Failed to seed test database');
      }
    })
    .catch(error => {
      console.error('❌ Test database setup failed:', error);
      cleanUp(1);
    });

  // Ctrl+C 등으로 프로세스가 종료될 때 컨테이너도 함께 종료되도록 설정
  process.on('SIGINT', () => {
    cleanUp(0);
  });
  process.on('SIGTERM', () => {
    cleanUp(0);
  });
}
export { setupTestDatabase, teardownTestDatabase };