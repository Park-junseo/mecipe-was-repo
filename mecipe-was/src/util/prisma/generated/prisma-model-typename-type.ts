/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';


/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelTypeName 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2025-11-04T13:12:21.391Z
 * 모델 개수: 28
 */
export type PrismaModelTypeName<TModelName extends Prisma.ModelName> = 
		TModelName extends 'Board' ? "Board" :
		TModelName extends 'BoardImage' ? "BoardImage" :
		TModelName extends 'BoardReply' ? "BoardReply" :
		TModelName extends 'CafeBoard' ? "CafeBoard" :
		TModelName extends 'CafeCoupon' ? "CafeCoupon" :
		TModelName extends 'CafeCouponGoupPartner' ? "CafeCouponGoupPartner" :
		TModelName extends 'CafeCouponGroup' ? "CafeCouponGroup" :
		TModelName extends 'CafeCouponHistory' ? "CafeCouponHistory" :
		TModelName extends 'CafeCouponQRCode' ? "CafeCouponQRCode" :
		TModelName extends 'CafeInfo' ? "CafeInfo" :
		TModelName extends 'CafeRealImage' ? "CafeRealImage" :
		TModelName extends 'CafeThumbnailImage' ? "CafeThumbnailImage" :
		TModelName extends 'CafeVirtualImage' ? "CafeVirtualImage" :
		TModelName extends 'CafeVirtualLink' ? "CafeVirtualLink" :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? "CafeVirtualLinkThumbnailImage" :
		TModelName extends 'ClosureProductCategory' ? "ClosureProductCategory" :
		TModelName extends 'ClosureRegionCategory' ? "ClosureRegionCategory" :
		TModelName extends 'MetaViewerActiveMap' ? "MetaViewerActiveMap" :
		TModelName extends 'MetaViewerInfo' ? "MetaViewerInfo" :
		TModelName extends 'MetaViewerMap' ? "MetaViewerMap" :
		TModelName extends 'Notice' ? "Notice" :
		TModelName extends 'Product' ? "Product" :
		TModelName extends 'ProductCategory' ? "ProductCategory" :
		TModelName extends 'ProductImage' ? "ProductImage" :
		TModelName extends 'ProxyUser' ? "ProxyUser" :
		TModelName extends 'RegionCategory' ? "RegionCategory" :
		TModelName extends 'User' ? "User" :
		TModelName extends 'WishlistProduct' ? "WishlistProduct" :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        undefined;
  