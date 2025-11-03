import { Type } from '@nestjs/common';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import * as Prisma from 'prisma/basic';
import { IRegionCategory, RegionCategory } from 'src/regioncategories/entities/region-category.entity';

@ObjectType({description: '카페 정보'})
export class CafeInfo implements Prisma.CafeInfo {
  @Field(() => Int, { description: 'ID' })
  id: number;
  @Field(() => Date, { description: '생성일' })
  createdAt: Date;
  @Field(() => Boolean, { description: '비활성화 여부' })
  isDisable: boolean;
  @Field(() => String, { description: '카페 이름' })
  name: string;
  @Field(() => String, { description: '코드' })
  code: string | null;
  @Field(() => Int, { description: '지역 카테고리 ID' })
  regionCategoryId: number;
  @Field(() => String, { description: '주소' })
  address: string;
  @Field(() => String, { description: '방향' })
  directions: string;
  @Field(() => String, { description: '사업자 번호' })
  businessNumber: string;
  @Field(() => String, { description: '대표자 이름' })
  ceoName: string;

  @Field(() => RegionCategory, { description: '지역 카테고리', nullable: true })
  RegionCategory: IRegionCategory;
}

export type ICafeInfo = InstanceType<typeof CafeInfo>;