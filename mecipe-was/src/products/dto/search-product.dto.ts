import { Transform } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class SearchProductDto {

    @IsOptional()
    @IsString()
    searchType?: string = 'name';

    @IsOptional()
    @IsString()
    searchText?: string;

    @IsOptional()
    @Transform(({ value }) => parseInt(value.toString()))
    @IsNumber()
    categoryId?: number;

    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isDisable?: boolean;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    cafeInfoId?: number;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    limit?: number = 10;
}