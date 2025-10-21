import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { Prisma } from "prisma/basic";
import { CreateProductImageDto } from "./create-product.dto";
import { Transform } from "class-transformer";

export class UpdateProductDto implements Partial<Prisma.ProductUpdateInput> {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  minOrderQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isDisable?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  categoryId?: number;
  
  @IsOptional()
  @IsArray()
  productImages?: CreateProductImageDto[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => parseInt(v)) : value)
  @IsNumber({}, { each: true })
  disabledImageIds?: number[];

  @IsOptional()
  @IsNumber()
  isThumbImageId?: number;

  @IsOptional()
  @IsArray()
  productRedirectUrlArray?: string[];

  @IsOptional()
  @IsBoolean()
  isSignature?: boolean;
}