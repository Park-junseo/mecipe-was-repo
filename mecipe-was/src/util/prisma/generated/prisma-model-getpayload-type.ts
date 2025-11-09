/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';


/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelGetPayload 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2025-11-08T03:24:37.138Z
 * 모델 개수: 28
 */
export type PrismaModelGetPayload<TModelName extends Prisma.ModelName, TSelect> = 
		TModelName extends 'Board' ? Prisma.BoardGetPayload<TSelect> :
		TModelName extends 'BoardImage' ? Prisma.BoardImageGetPayload<TSelect> :
		TModelName extends 'BoardReply' ? Prisma.BoardReplyGetPayload<TSelect> :
		TModelName extends 'CafeBoard' ? Prisma.CafeBoardGetPayload<TSelect> :
		TModelName extends 'CafeCoupon' ? Prisma.CafeCouponGetPayload<TSelect> :
		TModelName extends 'CafeCouponGoupPartner' ? Prisma.CafeCouponGoupPartnerGetPayload<TSelect> :
		TModelName extends 'CafeCouponGroup' ? Prisma.CafeCouponGroupGetPayload<TSelect> :
		TModelName extends 'CafeCouponHistory' ? Prisma.CafeCouponHistoryGetPayload<TSelect> :
		TModelName extends 'CafeCouponQRCode' ? Prisma.CafeCouponQRCodeGetPayload<TSelect> :
		TModelName extends 'CafeInfo' ? Prisma.CafeInfoGetPayload<TSelect> :
		TModelName extends 'CafeRealImage' ? Prisma.CafeRealImageGetPayload<TSelect> :
		TModelName extends 'CafeThumbnailImage' ? Prisma.CafeThumbnailImageGetPayload<TSelect> :
		TModelName extends 'CafeVirtualImage' ? Prisma.CafeVirtualImageGetPayload<TSelect> :
		TModelName extends 'CafeVirtualLink' ? Prisma.CafeVirtualLinkGetPayload<TSelect> :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? Prisma.CafeVirtualLinkThumbnailImageGetPayload<TSelect> :
		TModelName extends 'ClosureProductCategory' ? Prisma.ClosureProductCategoryGetPayload<TSelect> :
		TModelName extends 'ClosureRegionCategory' ? Prisma.ClosureRegionCategoryGetPayload<TSelect> :
		TModelName extends 'MetaViewerActiveMap' ? Prisma.MetaViewerActiveMapGetPayload<TSelect> :
		TModelName extends 'MetaViewerInfo' ? Prisma.MetaViewerInfoGetPayload<TSelect> :
		TModelName extends 'MetaViewerMap' ? Prisma.MetaViewerMapGetPayload<TSelect> :
		TModelName extends 'Notice' ? Prisma.NoticeGetPayload<TSelect> :
		TModelName extends 'Product' ? Prisma.ProductGetPayload<TSelect> :
		TModelName extends 'ProductCategory' ? Prisma.ProductCategoryGetPayload<TSelect> :
		TModelName extends 'ProductImage' ? Prisma.ProductImageGetPayload<TSelect> :
		TModelName extends 'ProxyUser' ? Prisma.ProxyUserGetPayload<TSelect> :
		TModelName extends 'RegionCategory' ? Prisma.RegionCategoryGetPayload<TSelect> :
		TModelName extends 'User' ? Prisma.UserGetPayload<TSelect> :
		TModelName extends 'WishlistProduct' ? Prisma.WishlistProductGetPayload<TSelect> :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        Record<string, any>;
  