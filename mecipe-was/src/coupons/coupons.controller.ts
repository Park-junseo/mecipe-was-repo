import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDataDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Public } from 'src/util/decorators';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) { }

  @Public()
  @Post('create-coupon')
  createCoupon(@Body() body: {
    payload: string,
    signature: string
  }
  ) {
    return this.couponsService.createCoupon(body.payload, body.signature);
  }

  @Public()
  @Post('create-coupon-qrcode')
  createCouponQRCode(@Body() body: {
    payload: string,
    signature: string,

  }) {
    return this.couponsService.createCouponQRCode(body.payload, body.signature);
  }

  @Public()
  @Post('find/group-code/member-id')
  findByCouponByGroupCodeWithUserId(
    @Body() body: {
      payload: string,
      signature: string
    }
  ) {
    return this.couponsService.findByCouponByGroupCodeWithUserId(body.payload, body.signature);
  }

  @Public()
  @Post('use-coupon/serial-number/actor-id')
  useCoupon(@Body() body: {
    payload: string,
    signature: string
  }) {
    return this.couponsService.useCoupon(body.payload, body.signature);
  }

  @Public()
  @Get('test-qr')
  testQr(@Query('text') text: string) {
    return this.couponsService.testQr(text);
  }
}
