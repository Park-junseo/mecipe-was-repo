import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { CafeInfoModule } from './cafe-info/cafe-info.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConfigModule,
    ElasticsearchModule,
    CafeInfoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
