import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const instanceId = process.env.NODE_APP_INSTANCE || process.env.INSTANCE_ID || process.pid;
  const port = process.env.SOCKET_PORT || 3000;
  
  console.log(`[Main] Starting application (Instance: ${instanceId}, PID: ${process.pid})`);
  console.log(`[Main] SOCKET_PORT: ${process.env.SOCKET_PORT || 'NOT SET (using default 3000)'}`);
  
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  console.log(`[Main] Application created (Instance: ${instanceId})`);
  console.log(`[Main] Listening on port ${port} (Instance: ${instanceId})`);
  
  await app.listen(port);
  
  console.log(`[Main] ✅ Application started successfully on port ${port} (Instance: ${instanceId}, PID: ${process.pid})`);
}
bootstrap().catch((error) => {
  const instanceId = process.env.NODE_APP_INSTANCE || process.env.INSTANCE_ID || process.pid;
  console.error(`[Main] ❌ Error starting application (Instance: ${instanceId}):`, error);
  // Stack trace만 출력하고, 에러 메시지는 간단하게
  if (error.stack) {
    console.error('Stack trace:', error.stack.split('\n').slice(0, 10).join('\n'));
  }
  process.exit(1);
});
