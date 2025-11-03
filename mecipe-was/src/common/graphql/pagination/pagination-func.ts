import { Prisma, PrismaPromise } from "prisma/basic";
import { BaseConnectionType } from "./base-connection.type";
import { PaginationArgs } from "./pagination-args.input";
import { PageInfo } from "./page-info.entity";
import { PrismaModelDelegate, PrismaModelGetPayload, PrismaModelSelect } from "src/util/prisma";

export async function findPaginationBasedCursor<TModelName extends Prisma.ModelName>(
  delegate: PrismaModelDelegate<TModelName, unknown>,
  args: PaginationArgs,
  cursorField: string = "id",
  select: PrismaModelSelect<TModelName> | undefined,
): Promise<BaseConnectionType<PrismaModelGetPayload<TModelName, {select: PrismaModelSelect<TModelName> | undefined}>>> {
  const { page, limit, after, maxPage } = args;
  const effectiveLimit = limit || 20; // 기본 limit 값 설정 (클라이언트가 넘겨주지 않았을 경우)

  const maxOffsetAllowed = maxPage * effectiveLimit;

  let queryOptions: any = {};

  let totalCount: number;
  let isOffsetBased = false;
  let currentOffset = 0; // Offset 기반 페이지네이션의 현재 시작 오프셋

  // 1. Offset 기반 페이징 우선 처리 (page와 limit이 제공되고, max_offset 이내인 경우)
  if (page && page > 0 && page * effectiveLimit <= maxOffsetAllowed) {
    isOffsetBased = true;
    currentOffset = (page - 1) * effectiveLimit;
    queryOptions.skip = currentOffset;
    console.log(`Offset-based pagination: page=${page}, limit=${effectiveLimit}, skip=${currentOffset}`);
  }
  // 2. Keyset 기반 페이징 처리 (after 커서가 있거나, page가 maxOffsetAllowed 초과하는 경우)
  else if (after || (page && page * effectiveLimit > maxOffsetAllowed)) {
    if (page && page * effectiveLimit > maxOffsetAllowed) {
      console.warn(`Deep offset-based pagination requested (page ${page}). Suggesting Keyset based. CurrentOffset: ${page * effectiveLimit}`);
      // 클라이언트에게 다음 페이지부터는 after를 사용하도록 유도하는 메시지 등을 반환할 수도 있음.
    }
    let decodedCursor: number | undefined;
    if (after) {
      decodedCursor = parseInt(Buffer.from(after, 'base64').toString('ascii').split('_')[1]);
    }

    if (decodedCursor) {
      queryOptions.cursor = { id: decodedCursor };
      queryOptions.skip = 1; // 커서 레코드 자신은 건너뛰기
      console.log(`Keyset-based pagination: after=${after}, decodedCursor=${decodedCursor}, limit=${effectiveLimit}`);
    } else {
      // Keyset 기반을 유도했으나 after가 없는 경우 (예: 맨 처음부터 무한 스크롤)
      console.log(`Keyset-based pagination (first fetch): limit=${effectiveLimit}`);
    }
  } else {
    // page, limit, after 아무것도 없는 경우 (기본 첫 페이지)
    isOffsetBased = true; // 기본적으로 첫 페이지는 offset 0으로 처리
    queryOptions.skip = 0;
    console.log(`Default first page: limit=${effectiveLimit}`);
  }

  // 쿼리 실행
  const items = await delegate.findMany.call(delegate, {
    take: effectiveLimit + 1, // 다음 페이지 존재 여부 확인을 위해 하나 더 가져옴
    orderBy: { id: 'asc' }, // 커서 기반 페이징을 위해 고정된 정렬 기준 필수
    select: select,
    ...queryOptions,
  });

  // 전체 개수는 Offset 기반 페이징에서만 유의미할 수 있으며, 성능 고려 필요
  if (isOffsetBased && page === 1) { // 첫 페이지 요청 시에만 totalCount 조회 (캐싱 권장)
    totalCount = await delegate.count.call(delegate, {});
  } else {
    totalCount = 0; // 또는 -1 등으로 표시하여 조회하지 않음을 나타냄
    if (!isOffsetBased) { // Keyset 기반에서는 totalCount를 정확히 알 수 없음.
      // this.logger.warn('Keyset-based pagination does not provide an accurate totalCount easily.');
    }
  }


  // 응답 Connection 객체 구성
  const hasNextPage = items.length > effectiveLimit;
  const edges = (hasNextPage ? items.slice(0, effectiveLimit) : items).map(item => ({
    node: item,
    cursor: Buffer.from(`id_${item[cursorField]}`).toString('base64'),
  }));

  const startCursor = edges.length > 0 ? edges[0].cursor : null;
  const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

  const pageInfo = new PageInfo();
  pageInfo.hasNextPage = hasNextPage;
  pageInfo.endCursor = endCursor;
  // hasPreviousPage는 Offset 기반에서는 currentOffset > 0, Keyset 기반에서는 after가 있다면 true로 판단
  pageInfo.hasPreviousPage = isOffsetBased ? currentOffset > 0 : !!after;
  pageInfo.startCursor = startCursor;

  return {
    edges,
    pageInfo,
    totalCount,
  };
}