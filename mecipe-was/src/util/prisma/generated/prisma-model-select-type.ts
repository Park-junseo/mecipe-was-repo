/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';


/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelSelect 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2025-11-08T03:24:37.134Z
 * 모델 개수: 28
 */
export type PrismaModelSelect<TModelName extends Prisma.ModelName> = 
		TModelName extends 'Board' ? Prisma.BoardSelect :
		TModelName extends 'BoardImage' ? Prisma.BoardImageSelect :
		TModelName extends 'BoardReply' ? Prisma.BoardReplySelect :
		TModelName extends 'CafeBoard' ? Prisma.CafeBoardSelect :
		TModelName extends 'CafeCoupon' ? Prisma.CafeCouponSelect :
		TModelName extends 'CafeCouponGoupPartner' ? Prisma.CafeCouponGoupPartnerSelect :
		TModelName extends 'CafeCouponGroup' ? Prisma.CafeCouponGroupSelect :
		TModelName extends 'CafeCouponHistory' ? Prisma.CafeCouponHistorySelect :
		TModelName extends 'CafeCouponQRCode' ? Prisma.CafeCouponQRCodeSelect :
		TModelName extends 'CafeInfo' ? Prisma.CafeInfoSelect :
		TModelName extends 'CafeRealImage' ? Prisma.CafeRealImageSelect :
		TModelName extends 'CafeThumbnailImage' ? Prisma.CafeThumbnailImageSelect :
		TModelName extends 'CafeVirtualImage' ? Prisma.CafeVirtualImageSelect :
		TModelName extends 'CafeVirtualLink' ? Prisma.CafeVirtualLinkSelect :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? Prisma.CafeVirtualLinkThumbnailImageSelect :
		TModelName extends 'ClosureProductCategory' ? Prisma.ClosureProductCategorySelect :
		TModelName extends 'ClosureRegionCategory' ? Prisma.ClosureRegionCategorySelect :
		TModelName extends 'MetaViewerActiveMap' ? Prisma.MetaViewerActiveMapSelect :
		TModelName extends 'MetaViewerInfo' ? Prisma.MetaViewerInfoSelect :
		TModelName extends 'MetaViewerMap' ? Prisma.MetaViewerMapSelect :
		TModelName extends 'Notice' ? Prisma.NoticeSelect :
		TModelName extends 'Product' ? Prisma.ProductSelect :
		TModelName extends 'ProductCategory' ? Prisma.ProductCategorySelect :
		TModelName extends 'ProductImage' ? Prisma.ProductImageSelect :
		TModelName extends 'ProxyUser' ? Prisma.ProxyUserSelect :
		TModelName extends 'RegionCategory' ? Prisma.RegionCategorySelect :
		TModelName extends 'User' ? Prisma.UserSelect :
		TModelName extends 'WishlistProduct' ? Prisma.WishlistProductSelect :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        Record<string, any>;
  