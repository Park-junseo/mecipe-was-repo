import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  console.log(process.env.PORT);
  await app.listen(process.env.PORT || 3000);
}
bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  // Stack trace만 출력하고, 에러 메시지는 간단하게
  if (error.stack) {
    console.error('Stack trace:', error.stack.split('\n').slice(0, 10).join('\n'));
  }
  process.exit(1);
});
