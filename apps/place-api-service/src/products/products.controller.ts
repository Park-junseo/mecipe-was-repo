import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { Public, RequireRole } from '../util/decorators';

interface RequestWithUser extends Request {
  user: {
    id: number;
    userType?: string;
    [key: string]: any;
  };
}

@Controller('products')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('create')
  @RequireRole('ADMIN')
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.createProduct(createProductDto);
  }

  @Get()
  @Public()
  findAllProducts(@Query() searchDto: SearchProductDto) {
    return this.productsService.findAllProductsBySearch(searchDto);
  }

  @Get('cafe-info-code/:cafeInfoCode')
  @Public()
  findProductDatabaseByCafeInfoCode(
    @Param('cafeInfoCode') cafeInfoCode: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findProductDatabaseByCafeInfoCode(
      cafeInfoCode,
      limit ? +limit : undefined,
    );
  }

  @Get('admin')
  @RequireRole('ADMIN')
  findAdminAllProducts(
    @Query() searchDto: SearchProductDto,
    @Request() req: RequestWithUser,
  ) {
    const isAdmin =
      req.user?.userType === 'ADMIN' || req.user?.userType === 'MANAGER';
    return this.productsService.findAllProductsBySearch(searchDto, isAdmin);
  }

  @Get('duplicate-code')
  findDuplicateProductCode(@Query('code') code: string) {
    return this.productsService.findDuplicateProductCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Patch(':id')
  @RequireRole('ADMIN')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  @RequireRole('ADMIN')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
