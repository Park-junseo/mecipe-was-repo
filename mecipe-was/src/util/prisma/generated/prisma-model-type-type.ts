/**
* ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
* 
* 생성 명령: npx ts-node scripts/prisma/generate-prisma-types.ts
* 
* Prisma 스키마 변경 후 이 스크립트를 실행하면 자동으로 업데이트됩니다.
*/

import { Prisma } from 'prisma/basic';
import * as PrismaBasic from 'prisma/basic';

/**
 * Prisma ModelName으로부터 해당 모델의 PrismaModelType 타입을 추출하는 헬퍼 타입
 * 
 * 자동 생성됨: 2025-11-08T03:24:37.138Z
 * 모델 개수: 28
 */
export type PrismaModelType<TModelName extends Prisma.ModelName> = 
		TModelName extends 'Board' ? PrismaBasic.Board :
		TModelName extends 'BoardImage' ? PrismaBasic.BoardImage :
		TModelName extends 'BoardReply' ? PrismaBasic.BoardReply :
		TModelName extends 'CafeBoard' ? PrismaBasic.CafeBoard :
		TModelName extends 'CafeCoupon' ? PrismaBasic.CafeCoupon :
		TModelName extends 'CafeCouponGoupPartner' ? PrismaBasic.CafeCouponGoupPartner :
		TModelName extends 'CafeCouponGroup' ? PrismaBasic.CafeCouponGroup :
		TModelName extends 'CafeCouponHistory' ? PrismaBasic.CafeCouponHistory :
		TModelName extends 'CafeCouponQRCode' ? PrismaBasic.CafeCouponQRCode :
		TModelName extends 'CafeInfo' ? PrismaBasic.CafeInfo :
		TModelName extends 'CafeRealImage' ? PrismaBasic.CafeRealImage :
		TModelName extends 'CafeThumbnailImage' ? PrismaBasic.CafeThumbnailImage :
		TModelName extends 'CafeVirtualImage' ? PrismaBasic.CafeVirtualImage :
		TModelName extends 'CafeVirtualLink' ? PrismaBasic.CafeVirtualLink :
		TModelName extends 'CafeVirtualLinkThumbnailImage' ? PrismaBasic.CafeVirtualLinkThumbnailImage :
		TModelName extends 'ClosureProductCategory' ? PrismaBasic.ClosureProductCategory :
		TModelName extends 'ClosureRegionCategory' ? PrismaBasic.ClosureRegionCategory :
		TModelName extends 'MetaViewerActiveMap' ? PrismaBasic.MetaViewerActiveMap :
		TModelName extends 'MetaViewerInfo' ? PrismaBasic.MetaViewerInfo :
		TModelName extends 'MetaViewerMap' ? PrismaBasic.MetaViewerMap :
		TModelName extends 'Notice' ? PrismaBasic.Notice :
		TModelName extends 'Product' ? PrismaBasic.Product :
		TModelName extends 'ProductCategory' ? PrismaBasic.ProductCategory :
		TModelName extends 'ProductImage' ? PrismaBasic.ProductImage :
		TModelName extends 'ProxyUser' ? PrismaBasic.ProxyUser :
		TModelName extends 'RegionCategory' ? PrismaBasic.RegionCategory :
		TModelName extends 'User' ? PrismaBasic.User :
		TModelName extends 'WishlistProduct' ? PrismaBasic.WishlistProduct :
        // 알 수 없는 모델에 대해서는 Record<string, any>를 반환
        Record<string, any>;
  