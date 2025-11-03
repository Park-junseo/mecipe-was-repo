import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Min } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true, description: '페이지 번호 (1부터 시작). Offset 기반 페이징 시 사용.' })
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, description: '최대 페이지 번호. Offset 기반 페이징 시 사용.' })
  @Min(1)
  maxPage?: number = 10;

  @Field(() => Int, { nullable: true, description: '한 페이지당 아이템 개수. Offset 기반 및 Keyset 기반 공통 사용.' })
  @Min(1)
  limit?: number; // Keyset에서는 first 역할도 겸함

  @Field(() => String, { nullable: true, description: 'Keyset 기반 페이징 시, 이 커서 이후의 데이터를 가져옴.' })
  after?: string;
}