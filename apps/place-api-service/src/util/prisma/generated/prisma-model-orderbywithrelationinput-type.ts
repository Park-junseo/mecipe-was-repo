/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from '../../../../prisma/basic';


/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelOrderByWithRelationInput 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2026-01-01T01:59:50.265Z
 * 모델 개수: 28
 */
export type PrismaModelOrderByWithRelationInput<TModelName extends Prisma.ModelName> = 
		TModelName extends 'Board' ? Prisma.BoardOrderByWithRelationInput :
		TModelName extends 'BoardImage' ? Prisma.BoardImageOrderByWithRelationInput :
		TModelName extends 'BoardReply' ? Prisma.BoardReplyOrderByWithRelationInput :
		TModelName extends 'CafeBoard' ? Prisma.CafeBoardOrderByWithRelationInput :
		TModelName extends 'CafeCoupon' ? Prisma.CafeCouponOrderByWithRelationInput :
		TModelName extends 'CafeCouponGoupPartner' ? Prisma.CafeCouponGoupPartnerOrderByWithRelationInput :
		TModelName extends 'CafeCouponGroup' ? Prisma.CafeCouponGroupOrderByWithRelationInput :
		TModelName extends 'CafeCouponHistory' ? Prisma.CafeCouponHistoryOrderByWithRelationInput :
		TModelName extends 'CafeCouponQRCode' ? Prisma.CafeCouponQRCodeOrderByWithRelationInput :
		TModelName extends 'CafeInfo' ? Prisma.CafeInfoOrderByWithRelationInput :
		TModelName extends 'CafeRealImage' ? Prisma.CafeRealImageOrderByWithRelationInput :
		TModelName extends 'CafeThumbnailImage' ? Prisma.CafeThumbnailImageOrderByWithRelationInput :
		TModelName extends 'CafeVirtualImage' ? Prisma.CafeVirtualImageOrderByWithRelationInput :
		TModelName extends 'CafeVirtualLink' ? Prisma.CafeVirtualLinkOrderByWithRelationInput :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? Prisma.CafeVirtualLinkThumbnailImageOrderByWithRelationInput :
		TModelName extends 'ClosureProductCategory' ? Prisma.ClosureProductCategoryOrderByWithRelationInput :
		TModelName extends 'ClosureRegionCategory' ? Prisma.ClosureRegionCategoryOrderByWithRelationInput :
		TModelName extends 'MetaViewerActiveMap' ? Prisma.MetaViewerActiveMapOrderByWithRelationInput :
		TModelName extends 'MetaViewerInfo' ? Prisma.MetaViewerInfoOrderByWithRelationInput :
		TModelName extends 'MetaViewerMap' ? Prisma.MetaViewerMapOrderByWithRelationInput :
		TModelName extends 'Notice' ? Prisma.NoticeOrderByWithRelationInput :
		TModelName extends 'Product' ? Prisma.ProductOrderByWithRelationInput :
		TModelName extends 'ProductCategory' ? Prisma.ProductCategoryOrderByWithRelationInput :
		TModelName extends 'ProductImage' ? Prisma.ProductImageOrderByWithRelationInput :
		TModelName extends 'ProxyUser' ? Prisma.ProxyUserOrderByWithRelationInput :
		TModelName extends 'RegionCategory' ? Prisma.RegionCategoryOrderByWithRelationInput :
		TModelName extends 'User' ? Prisma.UserOrderByWithRelationInput :
		TModelName extends 'WishlistProduct' ? Prisma.WishlistProductOrderByWithRelationInput :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        Record<string, any>;
  