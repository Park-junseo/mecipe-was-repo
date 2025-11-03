// src/common/pagination/page-info.entity.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({ description: '페이징 관련 정보를 제공합니다.' })
export class PageInfo {
  @Field(() => String, { nullable: true, description: '현재 페이지의 시작 커서' })
  startCursor?: string;

  @Field(() => String, { nullable: true, description: '현재 페이지의 끝 커서' })
  endCursor?: string;

  @Field(() => Boolean, { description: '다음 페이지가 있는지 여부' })
  hasNextPage: boolean;

  @Field(() => Boolean, { description: '이전 페이지가 있는지 여부' })
  hasPreviousPage: boolean;
}