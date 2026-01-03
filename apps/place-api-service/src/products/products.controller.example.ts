/**
 * Role 기반 접근 제어 사용 예시
 * 실제 products.controller.ts를 참고하여 작성
 */

import { Controller, Get, Post, Delete, Req } from '@nestjs/common';
import { RequireRole } from '@virtualcafe/common';

@Controller('products')
export class ProductsControllerExample {
  // 예시 1: 모든 인증된 사용자 접근 가능
  @Get()
  findAllProducts(@Req() req) {
    // AuthorizationGuard가 적용되어 있지만
    // RequireRole이 없으므로 모든 인증된 사용자 접근 가능
    return [];
  }

  // 예시 2: ADMIN 또는 MANAGER만 접근 가능
  @RequireRole('ADMIN', 'MANAGER')
  @Post()
  createProduct(@Req() req) {
    // ADMIN 또는 MANAGER role만 접근 가능
    return {};
  }

  // 예시 3: ADMIN만 접근 가능
  @RequireRole('ADMIN')
  @Delete(':id')
  deleteProduct(@Req() req) {
    // ADMIN role만 접근 가능
    return {};
  }

  // 예시 4: Controller 레벨 적용
  // @RequireRole('ADMIN') // 모든 엔드포인트에 적용
  // export class AdminProductsController { }
}




