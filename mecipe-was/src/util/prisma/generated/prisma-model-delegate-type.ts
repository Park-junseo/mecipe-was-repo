/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';
import { InternalArgs } from 'prisma/basic/runtime/library';

/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelDelegate 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2025-11-08T03:24:37.138Z
 * 모델 개수: 28
 */
export type PrismaModelDelegate<TModelName extends Prisma.ModelName, TOptions extends InternalArgs> = 
		TModelName extends 'Board' ? Prisma.BoardDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'BoardImage' ? Prisma.BoardImageDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'BoardReply' ? Prisma.BoardReplyDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeBoard' ? Prisma.CafeBoardDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeCoupon' ? Prisma.CafeCouponDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeCouponGoupPartner' ? Prisma.CafeCouponGoupPartnerDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeCouponGroup' ? Prisma.CafeCouponGroupDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeCouponHistory' ? Prisma.CafeCouponHistoryDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeCouponQRCode' ? Prisma.CafeCouponQRCodeDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeInfo' ? Prisma.CafeInfoDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeRealImage' ? Prisma.CafeRealImageDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeThumbnailImage' ? Prisma.CafeThumbnailImageDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeVirtualImage' ? Prisma.CafeVirtualImageDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeVirtualLink' ? Prisma.CafeVirtualLinkDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? Prisma.CafeVirtualLinkThumbnailImageDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'ClosureProductCategory' ? Prisma.ClosureProductCategoryDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'ClosureRegionCategory' ? Prisma.ClosureRegionCategoryDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'MetaViewerActiveMap' ? Prisma.MetaViewerActiveMapDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'MetaViewerInfo' ? Prisma.MetaViewerInfoDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'MetaViewerMap' ? Prisma.MetaViewerMapDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'Notice' ? Prisma.NoticeDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'Product' ? Prisma.ProductDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'ProductCategory' ? Prisma.ProductCategoryDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'ProductImage' ? Prisma.ProductImageDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'ProxyUser' ? Prisma.ProxyUserDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'RegionCategory' ? Prisma.RegionCategoryDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'User' ? Prisma.UserDelegate<TOptions, Prisma.PrismaClientOptions> :
		TModelName extends 'WishlistProduct' ? Prisma.WishlistProductDelegate<TOptions, Prisma.PrismaClientOptions> :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        unknown;
  