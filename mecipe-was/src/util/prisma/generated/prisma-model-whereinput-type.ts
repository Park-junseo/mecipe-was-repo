/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';


/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelWhereInput 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2025-11-04T13:12:21.391Z
 * 모델 개수: 28
 */
export type PrismaModelWhereInput<TModelName extends Prisma.ModelName> = 
		TModelName extends 'Board' ? Prisma.BoardWhereInput :
		TModelName extends 'BoardImage' ? Prisma.BoardImageWhereInput :
		TModelName extends 'BoardReply' ? Prisma.BoardReplyWhereInput :
		TModelName extends 'CafeBoard' ? Prisma.CafeBoardWhereInput :
		TModelName extends 'CafeCoupon' ? Prisma.CafeCouponWhereInput :
		TModelName extends 'CafeCouponGoupPartner' ? Prisma.CafeCouponGoupPartnerWhereInput :
		TModelName extends 'CafeCouponGroup' ? Prisma.CafeCouponGroupWhereInput :
		TModelName extends 'CafeCouponHistory' ? Prisma.CafeCouponHistoryWhereInput :
		TModelName extends 'CafeCouponQRCode' ? Prisma.CafeCouponQRCodeWhereInput :
		TModelName extends 'CafeInfo' ? Prisma.CafeInfoWhereInput :
		TModelName extends 'CafeRealImage' ? Prisma.CafeRealImageWhereInput :
		TModelName extends 'CafeThumbnailImage' ? Prisma.CafeThumbnailImageWhereInput :
		TModelName extends 'CafeVirtualImage' ? Prisma.CafeVirtualImageWhereInput :
		TModelName extends 'CafeVirtualLink' ? Prisma.CafeVirtualLinkWhereInput :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? Prisma.CafeVirtualLinkThumbnailImageWhereInput :
		TModelName extends 'ClosureProductCategory' ? Prisma.ClosureProductCategoryWhereInput :
		TModelName extends 'ClosureRegionCategory' ? Prisma.ClosureRegionCategoryWhereInput :
		TModelName extends 'MetaViewerActiveMap' ? Prisma.MetaViewerActiveMapWhereInput :
		TModelName extends 'MetaViewerInfo' ? Prisma.MetaViewerInfoWhereInput :
		TModelName extends 'MetaViewerMap' ? Prisma.MetaViewerMapWhereInput :
		TModelName extends 'Notice' ? Prisma.NoticeWhereInput :
		TModelName extends 'Product' ? Prisma.ProductWhereInput :
		TModelName extends 'ProductCategory' ? Prisma.ProductCategoryWhereInput :
		TModelName extends 'ProductImage' ? Prisma.ProductImageWhereInput :
		TModelName extends 'ProxyUser' ? Prisma.ProxyUserWhereInput :
		TModelName extends 'RegionCategory' ? Prisma.RegionCategoryWhereInput :
		TModelName extends 'User' ? Prisma.UserWhereInput :
		TModelName extends 'WishlistProduct' ? Prisma.WishlistProductWhereInput :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        Record<string, any>;
  