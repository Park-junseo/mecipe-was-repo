/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';


/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelDelegate 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2025-11-04T13:12:21.391Z
 * 모델 개수: 28
 */
export type PrismaModelDelegate<TModelName extends Prisma.ModelName, TOptions> = 
		TModelName extends 'Board' ? Prisma.BoardDelegate<TOptions> :
		TModelName extends 'BoardImage' ? Prisma.BoardImageDelegate<TOptions> :
		TModelName extends 'BoardReply' ? Prisma.BoardReplyDelegate<TOptions> :
		TModelName extends 'CafeBoard' ? Prisma.CafeBoardDelegate<TOptions> :
		TModelName extends 'CafeCoupon' ? Prisma.CafeCouponDelegate<TOptions> :
		TModelName extends 'CafeCouponGoupPartner' ? Prisma.CafeCouponGoupPartnerDelegate<TOptions> :
		TModelName extends 'CafeCouponGroup' ? Prisma.CafeCouponGroupDelegate<TOptions> :
		TModelName extends 'CafeCouponHistory' ? Prisma.CafeCouponHistoryDelegate<TOptions> :
		TModelName extends 'CafeCouponQRCode' ? Prisma.CafeCouponQRCodeDelegate<TOptions> :
		TModelName extends 'CafeInfo' ? Prisma.CafeInfoDelegate<TOptions> :
		TModelName extends 'CafeRealImage' ? Prisma.CafeRealImageDelegate<TOptions> :
		TModelName extends 'CafeThumbnailImage' ? Prisma.CafeThumbnailImageDelegate<TOptions> :
		TModelName extends 'CafeVirtualImage' ? Prisma.CafeVirtualImageDelegate<TOptions> :
		TModelName extends 'CafeVirtualLink' ? Prisma.CafeVirtualLinkDelegate<TOptions> :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? Prisma.CafeVirtualLinkThumbnailImageDelegate<TOptions> :
		TModelName extends 'ClosureProductCategory' ? Prisma.ClosureProductCategoryDelegate<TOptions> :
		TModelName extends 'ClosureRegionCategory' ? Prisma.ClosureRegionCategoryDelegate<TOptions> :
		TModelName extends 'MetaViewerActiveMap' ? Prisma.MetaViewerActiveMapDelegate<TOptions> :
		TModelName extends 'MetaViewerInfo' ? Prisma.MetaViewerInfoDelegate<TOptions> :
		TModelName extends 'MetaViewerMap' ? Prisma.MetaViewerMapDelegate<TOptions> :
		TModelName extends 'Notice' ? Prisma.NoticeDelegate<TOptions> :
		TModelName extends 'Product' ? Prisma.ProductDelegate<TOptions> :
		TModelName extends 'ProductCategory' ? Prisma.ProductCategoryDelegate<TOptions> :
		TModelName extends 'ProductImage' ? Prisma.ProductImageDelegate<TOptions> :
		TModelName extends 'ProxyUser' ? Prisma.ProxyUserDelegate<TOptions> :
		TModelName extends 'RegionCategory' ? Prisma.RegionCategoryDelegate<TOptions> :
		TModelName extends 'User' ? Prisma.UserDelegate<TOptions> :
		TModelName extends 'WishlistProduct' ? Prisma.WishlistProductDelegate<TOptions> :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        unknown;
  