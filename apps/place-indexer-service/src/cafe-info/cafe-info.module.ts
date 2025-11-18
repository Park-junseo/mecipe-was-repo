import { Module } from '@nestjs/common';
import { ElasticsearchModule } from 'src/elasticsearch';
import { CafeInfoController } from './cafe-info.controller';
import { CafeInfoService } from './cafe-info.service';

@Module({
  imports: [ElasticsearchModule],
  controllers: [CafeInfoController],
  providers: [CafeInfoService],
})
export class CafeInfoModule {}
