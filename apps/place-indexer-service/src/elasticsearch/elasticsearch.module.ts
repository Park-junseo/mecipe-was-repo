import { Module, Global } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { ConfigModule } from '@nestjs/config';

@Global() // 다른 모듈에서 별도 export 없이 바로 ElasticsearchService 주입 가능
@Module({
  imports: [ConfigModule], // ConfigService 사용을 위해 임포트
  providers: [ElasticsearchService],
  exports: [ElasticsearchService], // ElasticsearchService를 다른 모듈에서 사용 가능하게 export
})
export class ElasticsearchModule {}
