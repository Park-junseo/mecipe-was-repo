import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDataDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Public } from '../util/decorators';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('create-coupon')
  @Public()
  createCoupon(@Body() body: { payload: string; signature: string }) {
    return this.couponsService.createCoupon(body.payload, body.signature);
  }

  @Post('create-coupon-qrcode')
  @Public()
  createCouponQRCode(@Body() body: { payload: string; signature: string }) {
    return this.couponsService.createCouponQRCode(body.payload, body.signature);
  }

  @Post('find/group-code/member-id')
  @Public()
  findByCouponByGroupCodeWithUserId(
    @Body() body: { payload: string; signature: string },
  ) {
    return this.couponsService.findByCouponByGroupCodeWithUserId(
      body.payload,
      body.signature,
    );
  }

  @Post('use-coupon/serial-number/actor-id')
  @Public()
  useCoupon(@Body() body: { payload: string; signature: string }) {
    return this.couponsService.useCoupon(body.payload, body.signature);
  }

  @Get('test-qr')
  @Public()
  testQr(@Query('text') text: string) {
    return this.couponsService.testQr(text);
  }
}
