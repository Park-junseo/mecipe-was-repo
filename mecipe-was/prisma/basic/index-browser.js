
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum
} = require('./runtime/index-browser')


const Prisma = {}

exports.Prisma = Prisma

/**
 * Prisma Client JS version: 4.7.0
 * Query Engine version: 39190b250ebc338586e25e6da45e5e783bc8a635
 */
Prisma.prismaVersion = {
  client: "4.7.0",
  engine: "39190b250ebc338586e25e6da45e5e783bc8a635"
}

Prisma.PrismaClientKnownRequestError = () => {
  throw new Error(`PrismaClientKnownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  throw new Error(`PrismaClientUnknownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientRustPanicError = () => {
  throw new Error(`PrismaClientRustPanicError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientInitializationError = () => {
  throw new Error(`PrismaClientInitializationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientValidationError = () => {
  throw new Error(`PrismaClientValidationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.NotFoundError = () => {
  throw new Error(`NotFoundError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  throw new Error(`sqltag is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.empty = () => {
  throw new Error(`empty is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.join = () => {
  throw new Error(`join is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.raw = () => {
  throw new Error(`raw is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.validator = () => (val) => val


/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */
// Based on
// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
function makeEnum(x) { return x; }

exports.Prisma.BoardImageScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  url: 'url',
  thumbnailUrl: 'thumbnailUrl',
  width: 'width',
  height: 'height',
  size: 'size',
  isThumb: 'isThumb',
  isDisable: 'isDisable',
  boardId: 'boardId'
});

exports.Prisma.BoardReplyScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  content: 'content',
  isDisable: 'isDisable',
  userId: 'userId',
  boardId: 'boardId',
  boardReplyId: 'boardReplyId'
});

exports.Prisma.BoardScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  title: 'title',
  content: 'content',
  link: 'link',
  startDay: 'startDay',
  endDay: 'endDay',
  isDisable: 'isDisable',
  isReplyAvaliable: 'isReplyAvaliable',
  userId: 'userId',
  boardType: 'boardType'
});

exports.Prisma.CafeBoardScalarFieldEnum = makeEnum({
  boardId: 'boardId',
  cafeInfoId: 'cafeInfoId',
  createdAt: 'createdAt'
});

exports.Prisma.CafeCouponGoupPartnerScalarFieldEnum = makeEnum({
  cafeCouponGroupId: 'cafeCouponGroupId',
  cafeInfoId: 'cafeInfoId'
});

exports.Prisma.CafeCouponGroupScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  code: 'code',
  name: 'name',
  tag: 'tag',
  description: 'description',
  isDisable: 'isDisable',
  startDay: 'startDay',
  endDay: 'endDay',
  issuanceStartDay: 'issuanceStartDay',
  issuanceEndDay: 'issuanceEndDay'
});

exports.Prisma.CafeCouponHistoryScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  cafeCouponId: 'cafeCouponId',
  eventType: 'eventType',
  description: 'description',
  actorId: 'actorId',
  statusBefore: 'statusBefore',
  statusAfter: 'statusAfter'
});

exports.Prisma.CafeCouponQRCodeScalarFieldEnum = makeEnum({
  serialNumber: 'serialNumber',
  createdAt: 'createdAt',
  isDisable: 'isDisable',
  cafeCouponId: 'cafeCouponId',
  size: 'size',
  base64Data: 'base64Data'
});

exports.Prisma.CafeCouponScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  name: 'name',
  content: 'content',
  serialNumber: 'serialNumber',
  startDay: 'startDay',
  endDay: 'endDay',
  isDisable: 'isDisable',
  proxyUserId: 'proxyUserId',
  cafeCouponGroupId: 'cafeCouponGroupId'
});

exports.Prisma.CafeInfoScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  isDisable: 'isDisable',
  name: 'name',
  code: 'code',
  regionCategoryId: 'regionCategoryId',
  address: 'address',
  directions: 'directions',
  businessNumber: 'businessNumber',
  ceoName: 'ceoName'
});

exports.Prisma.CafeRealImageScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  url: 'url',
  width: 'width',
  height: 'height',
  size: 'size',
  priority: 'priority',
  isDisable: 'isDisable',
  cafeInfoId: 'cafeInfoId'
});

exports.Prisma.CafeThumbnailImageScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  url: 'url',
  thumbnailUrl: 'thumbnailUrl',
  width: 'width',
  height: 'height',
  size: 'size',
  priority: 'priority',
  isDisable: 'isDisable',
  cafeInfoId: 'cafeInfoId'
});

exports.Prisma.CafeVirtualImageScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  url: 'url',
  width: 'width',
  height: 'height',
  size: 'size',
  priority: 'priority',
  isDisable: 'isDisable',
  cafeInfoId: 'cafeInfoId'
});

exports.Prisma.CafeVirtualLinkScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  name: 'name',
  url: 'url',
  type: 'type',
  isDisable: 'isDisable',
  isAvaliable: 'isAvaliable',
  cafeInfoId: 'cafeInfoId'
});

exports.Prisma.CafeVirtualLinkThumbnailImageScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  url: 'url',
  width: 'width',
  height: 'height',
  size: 'size',
  cafeVirtualLinkId: 'cafeVirtualLinkId'
});

exports.Prisma.ClosureProductCategoryScalarFieldEnum = makeEnum({
  ancestor: 'ancestor',
  descendant: 'descendant',
  depth: 'depth'
});

exports.Prisma.ClosureRegionCategoryScalarFieldEnum = makeEnum({
  ancestor: 'ancestor',
  descendant: 'descendant',
  depth: 'depth'
});

exports.Prisma.JsonNullValueFilter = makeEnum({
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
});

exports.Prisma.JsonNullValueInput = makeEnum({
  JsonNull: Prisma.JsonNull
});

exports.Prisma.MetaViewerActiveMapScalarFieldEnum = makeEnum({
  id: 'id',
  updatedAt: 'updatedAt',
  metaViewerInfoId: 'metaViewerInfoId',
  activeRenderMapId: 'activeRenderMapId',
  activeColliderMapId: 'activeColliderMapId'
});

exports.Prisma.MetaViewerInfoScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  code: 'code',
  isDisable: 'isDisable',
  worldData: 'worldData',
  cafeInfoId: 'cafeInfoId'
});

exports.Prisma.MetaViewerMapScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  type: 'type',
  version: 'version',
  url: 'url',
  size: 'size',
  contentKey: 'contentKey',
  isDraco: 'isDraco',
  metaViewerInfoId: 'metaViewerInfoId'
});

exports.Prisma.NoticeScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  title: 'title',
  content: 'content',
  link: 'link',
  userId: 'userId'
});

exports.Prisma.ProductCategoryScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  name: 'name',
  description: 'description',
  isDisable: 'isDisable',
  code: 'code'
});

exports.Prisma.ProductImageScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  url: 'url',
  thumbnailUrl: 'thumbnailUrl',
  width: 'width',
  height: 'height',
  size: 'size',
  isDisable: 'isDisable',
  isThumb: 'isThumb',
  productId: 'productId'
});

exports.Prisma.ProductScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name',
  code: 'code',
  description: 'description',
  price: 'price',
  originalPrice: 'originalPrice',
  stockQuantity: 'stockQuantity',
  minOrderQuantity: 'minOrderQuantity',
  isDisable: 'isDisable',
  isAvailable: 'isAvailable',
  categoryId: 'categoryId',
  cafeInfoId: 'cafeInfoId',
  productRedirectUrl: 'productRedirectUrl',
  isSignature: 'isSignature'
});

exports.Prisma.ProxyUserScalarFieldEnum = makeEnum({
  id: 'id',
  memberId: 'memberId',
  createdAt: 'createdAt',
  proxyUserType: 'proxyUserType',
  name: 'name',
  token: 'token',
  userId: 'userId'
});

exports.Prisma.QueryMode = makeEnum({
  default: 'default',
  insensitive: 'insensitive'
});

exports.Prisma.RegionCategoryScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  name: 'name',
  isDisable: 'isDisable',
  govermentType: 'govermentType'
});

exports.Prisma.SortOrder = makeEnum({
  asc: 'asc',
  desc: 'desc'
});

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  loginId: 'loginId',
  loginPw: 'loginPw',
  username: 'username',
  loginType: 'loginType',
  userType: 'userType',
  nickname: 'nickname',
  email: 'email',
  isDisable: 'isDisable'
});

exports.Prisma.WishlistProductScalarFieldEnum = makeEnum({
  id: 'id',
  createdAt: 'createdAt',
  productId: 'productId',
  proxyUserId: 'proxyUserId'
});
exports.BoardType = makeEnum({
  BTALK: 'BTALK',
  BINFORM: 'BINFORM',
  BQUESTION: 'BQUESTION',
  BEVENT: 'BEVENT'
});

exports.CafeCouponEventType = makeEnum({
  CREATED: 'CREATED',
  USED: 'USED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  UPDATE: 'UPDATE'
});

exports.CafeCouponStatus = makeEnum({
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED'
});

exports.GovermentType = makeEnum({
  SPECIAL_CITY: 'SPECIAL_CITY',
  METROPOLITAN_CITY: 'METROPOLITAN_CITY',
  SPECIAL_SELF_GOVERNING_CITY: 'SPECIAL_SELF_GOVERNING_CITY',
  PROVINCE: 'PROVINCE',
  SPECIAL_SELF_GOVERNING_PROVINCE: 'SPECIAL_SELF_GOVERNING_PROVINCE',
  DISTRICT: 'DISTRICT',
  CITY: 'CITY',
  COUNTY: 'COUNTY',
  TOWN: 'TOWN',
  TOWNSHIP: 'TOWNSHIP',
  NEIGHBORHOOD: 'NEIGHBORHOOD',
  PLACENAME: 'PLACENAME'
});

exports.LoginType = makeEnum({
  LOCAL: 'LOCAL',
  ADMIN: 'ADMIN',
  KAKAO: 'KAKAO',
  NAVER: 'NAVER',
  GOOGLE: 'GOOGLE',
  APPLE: 'APPLE',
  ZEPETO: 'ZEPETO'
});

exports.MetaMapType = makeEnum({
  RENDER: 'RENDER',
  COLLIDER: 'COLLIDER'
});

exports.ProxyUserType = makeEnum({
  ETC: 'ETC',
  WEB: 'WEB',
  ZEPETO: 'ZEPETO',
  WEV_VIEWER: 'WEV_VIEWER'
});

exports.UserType = makeEnum({
  GENERAL: 'GENERAL',
  BUSINESS: 'BUSINESS',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER'
});

exports.Prisma.ModelName = makeEnum({
  User: 'User',
  Notice: 'Notice',
  Board: 'Board',
  BoardImage: 'BoardImage',
  BoardReply: 'BoardReply',
  CafeBoard: 'CafeBoard',
  RegionCategory: 'RegionCategory',
  ClosureRegionCategory: 'ClosureRegionCategory',
  CafeInfo: 'CafeInfo',
  CafeThumbnailImage: 'CafeThumbnailImage',
  CafeVirtualImage: 'CafeVirtualImage',
  CafeRealImage: 'CafeRealImage',
  CafeVirtualLink: 'CafeVirtualLink',
  CafeVirtualLinkThumbnailImage: 'CafeVirtualLinkThumbnailImage',
  CafeCouponGroup: 'CafeCouponGroup',
  CafeCouponGoupPartner: 'CafeCouponGoupPartner',
  ProxyUser: 'ProxyUser',
  CafeCoupon: 'CafeCoupon',
  CafeCouponHistory: 'CafeCouponHistory',
  CafeCouponQRCode: 'CafeCouponQRCode',
  MetaViewerInfo: 'MetaViewerInfo',
  MetaViewerMap: 'MetaViewerMap',
  MetaViewerActiveMap: 'MetaViewerActiveMap',
  ProductCategory: 'ProductCategory',
  ClosureProductCategory: 'ClosureProductCategory',
  Product: 'Product',
  WishlistProduct: 'WishlistProduct',
  ProductImage: 'ProductImage'
});

/**
 * Create the Client
 */
class PrismaClient {
  constructor() {
    throw new Error(
      `PrismaClient is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
    )
  }
}
exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
