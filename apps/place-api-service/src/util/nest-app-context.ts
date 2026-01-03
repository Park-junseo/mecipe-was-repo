import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

let app: INestApplicationContext;

export async function getAppModuleContext(): Promise<INestApplicationContext> {
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
    await app.init(); // 모듈 초기화 (OnModuleInit 훅 등 실행)
  }
  return app;
}

export async function closeAppModuleContext() {
  if (app) {
    await app.close();
    app = undefined;
  }
}