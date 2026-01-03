import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  console.log(`🚀 API Gateway starting on port ${port}`);
  
  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error('Error starting API Gateway:', error);
  if (error.stack) {
    console.error('Stack trace:', error.stack.split('\n').slice(0, 10).join('\n'));
  }
  process.exit(1);
});




