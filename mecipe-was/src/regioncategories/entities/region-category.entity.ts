import { Field, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import * as Prisma from "prisma/basic";
import { GovermentType } from "prisma/basic";
import { CafeInfo, ICafeInfo } from "src/places/entities/cafe-info.entity";

// GraphQL Enum 등록
registerEnumType(GovermentType, { name: "GovermentType" });

@ObjectType({ description: "지역 카테고리" })
export class RegionCategory implements Prisma.RegionCategory {
  @Field(() => Int, { description: 'ID' })
  id: number;
  @Field(() => Date, { description: '생성일' })
  createdAt: Date;
  @Field(() => Boolean, { description: '비활성화 여부' })
  isDisable: boolean;
  @Field(() => String, { description: '이름' })
  name: string;
  @Field(() => GovermentType, { description: '관할 유형' })
  govermentType: Prisma.GovermentType;
  @Field(() => [CafeInfo], { description: '카페 정보' })
  CafeInfos: ICafeInfo[];
}

export type IRegionCategory = InstanceType<typeof RegionCategory>;