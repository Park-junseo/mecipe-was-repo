import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { RoutePolicyService } from './route-policy.service';

@Module({
  imports: [HttpModule],
  controllers: [GatewayController],
  providers: [GatewayService, RoutePolicyService],
  exports: [RoutePolicyService], // 다른 모듈에서 사용할 수 있도록 export
})
export class GatewayModule {}




