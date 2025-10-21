
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  decompressFromBase64,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions
} = require('./runtime/index')


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

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
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


  const path = require('path')

const { findSync } = require('./runtime')
const fs = require('fs')

// some frameworks or bundlers replace or totally remove __dirname
const hasDirname = typeof __dirname !== 'undefined' && __dirname !== '/'

// will work in most cases, ie. if the client has not been bundled
const regularDirname = hasDirname && fs.existsSync(path.join(__dirname, 'schema.prisma')) && __dirname

// if the client has been bundled, we need to look for the folders
const foundDirname = !regularDirname && findSync(process.cwd(), [
    "prisma\\basic",
    "basic",
], ['d'], ['d'], 1)[0]

const dirname = regularDirname || foundDirname || __dirname

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

const dmmfString = "{\"datamodel\":{\"enums\":[{\"name\":\"LoginType\",\"values\":[{\"name\":\"LOCAL\",\"dbName\":null},{\"name\":\"ADMIN\",\"dbName\":null},{\"name\":\"KAKAO\",\"dbName\":null},{\"name\":\"NAVER\",\"dbName\":null},{\"name\":\"GOOGLE\",\"dbName\":null},{\"name\":\"APPLE\",\"dbName\":null},{\"name\":\"ZEPETO\",\"dbName\":null}],\"dbName\":null},{\"name\":\"UserType\",\"values\":[{\"name\":\"GENERAL\",\"dbName\":null},{\"name\":\"BUSINESS\",\"dbName\":null},{\"name\":\"ADMIN\",\"dbName\":null},{\"name\":\"MANAGER\",\"dbName\":null}],\"dbName\":null},{\"name\":\"BoardType\",\"values\":[{\"name\":\"BTALK\",\"dbName\":null},{\"name\":\"BINFORM\",\"dbName\":null},{\"name\":\"BQUESTION\",\"dbName\":null},{\"name\":\"BEVENT\",\"dbName\":null}],\"dbName\":null},{\"name\":\"GovermentType\",\"values\":[{\"name\":\"SPECIAL_CITY\",\"dbName\":null},{\"name\":\"METROPOLITAN_CITY\",\"dbName\":null},{\"name\":\"SPECIAL_SELF_GOVERNING_CITY\",\"dbName\":null},{\"name\":\"PROVINCE\",\"dbName\":null},{\"name\":\"SPECIAL_SELF_GOVERNING_PROVINCE\",\"dbName\":null},{\"name\":\"DISTRICT\",\"dbName\":null},{\"name\":\"CITY\",\"dbName\":null},{\"name\":\"COUNTY\",\"dbName\":null},{\"name\":\"TOWN\",\"dbName\":null},{\"name\":\"TOWNSHIP\",\"dbName\":null},{\"name\":\"NEIGHBORHOOD\",\"dbName\":null},{\"name\":\"PLACENAME\",\"dbName\":null}],\"dbName\":null},{\"name\":\"ProxyUserType\",\"values\":[{\"name\":\"ETC\",\"dbName\":null},{\"name\":\"WEB\",\"dbName\":null},{\"name\":\"ZEPETO\",\"dbName\":null},{\"name\":\"WEV_VIEWER\",\"dbName\":null}],\"dbName\":null},{\"name\":\"CafeCouponEventType\",\"values\":[{\"name\":\"CREATED\",\"dbName\":null},{\"name\":\"USED\",\"dbName\":null},{\"name\":\"REVOKED\",\"dbName\":null},{\"name\":\"EXPIRED\",\"dbName\":null},{\"name\":\"UPDATE\",\"dbName\":null}],\"dbName\":null},{\"name\":\"CafeCouponStatus\",\"values\":[{\"name\":\"ACTIVE\",\"dbName\":null},{\"name\":\"USED\",\"dbName\":null},{\"name\":\"REVOKED\",\"dbName\":null},{\"name\":\"EXPIRED\",\"dbName\":null}],\"dbName\":null},{\"name\":\"MetaMapType\",\"values\":[{\"name\":\"RENDER\",\"dbName\":null},{\"name\":\"COLLIDER\",\"dbName\":null}],\"dbName\":null}],\"models\":[{\"name\":\"User\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"loginId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"loginPw\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"username\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"loginType\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"LoginType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userType\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"UserType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nickname\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Boards\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Board\",\"relationName\":\"BoardToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"BoardReplies\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BoardReply\",\"relationName\":\"BoardReplyToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Notices\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Notice\",\"relationName\":\"NoticeToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ProxyUsers\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProxyUser\",\"relationName\":\"ProxyUserToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCouponHistories\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponHistory\",\"relationName\":\"CafeCouponHistoryToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"loginType\",\"loginId\"]],\"uniqueIndexes\":[{\"name\":\"loginUnique\",\"fields\":[\"loginType\",\"loginId\"]}],\"isGenerated\":false},{\"name\":\"Notice\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"content\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"link\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"User\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"NoticeToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"Board\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"title\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"content\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"link\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isReplyAvaliable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"BoardImages\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BoardImage\",\"relationName\":\"BoardToBoardImage\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"BoardReplies\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BoardReply\",\"relationName\":\"BoardToBoardReply\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"User\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"BoardToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"boardType\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"BoardType\",\"default\":\"BTALK\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeBoards\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeBoard\",\"relationName\":\"BoardToCafeBoard\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"BoardImage\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"thumbnailUrl\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"width\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"height\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isThumb\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"boardId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Board\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Board\",\"relationName\":\"BoardToBoardImage\",\"relationFromFields\":[\"boardId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"BoardReply\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"content\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"User\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"BoardReplyToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"boardId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Board\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Board\",\"relationName\":\"BoardToBoardReply\",\"relationFromFields\":[\"boardId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"boardReplyId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"BoardReply\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BoardReply\",\"relationName\":\"BoardNestedReply\",\"relationFromFields\":[\"boardReplyId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"BoardNestedReplies\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"BoardReply\",\"relationName\":\"BoardNestedReply\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeBoard\",\"dbName\":null,\"fields\":[{\"name\":\"boardId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Board\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Board\",\"relationName\":\"BoardToCafeBoard\",\"relationFromFields\":[\"boardId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeBoardToCafeInfo\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"boardId\",\"cafeInfoId\"]],\"uniqueIndexes\":[{\"name\":\"cafeBoardUnique\",\"fields\":[\"boardId\",\"cafeInfoId\"]}],\"isGenerated\":false},{\"name\":\"RegionCategory\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"govermentType\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GovermentType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfos\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeInfoToRegionCategory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"AncestorCategories\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ClosureRegionCategory\",\"relationName\":\"AncestorCategory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"DescendantCategories\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ClosureRegionCategory\",\"relationName\":\"DescendantCategory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"ClosureRegionCategory\",\"dbName\":null,\"fields\":[{\"name\":\"ancestor\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descendant\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"depth\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"AncestorCategory\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RegionCategory\",\"relationName\":\"AncestorCategory\",\"relationFromFields\":[\"ancestor\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"DescendantCategory\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RegionCategory\",\"relationName\":\"DescendantCategory\",\"relationFromFields\":[\"descendant\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"ancestor\",\"descendant\",\"depth\"]],\"uniqueIndexes\":[{\"name\":\"regionCategoryTreeUnique\",\"fields\":[\"ancestor\",\"descendant\",\"depth\"]}],\"isGenerated\":false},{\"name\":\"CafeInfo\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"regionCategoryId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"RegionCategory\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"RegionCategory\",\"relationName\":\"CafeInfoToRegionCategory\",\"relationFromFields\":[\"regionCategoryId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"address\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"directions\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"businessNumber\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ceoName\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeVirtualLinks\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeVirtualLink\",\"relationName\":\"CafeInfoToCafeVirtualLink\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeThumbnailImages\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeThumbnailImage\",\"relationName\":\"CafeInfoToCafeThumbnailImage\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeVirtualImages\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeVirtualImage\",\"relationName\":\"CafeInfoToCafeVirtualImage\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeRealImages\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeRealImage\",\"relationName\":\"CafeInfoToCafeRealImage\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCouponGroupPartners\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponGoupPartner\",\"relationName\":\"CafeCouponGoupPartnerToCafeInfo\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeBoards\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeBoard\",\"relationName\":\"CafeBoardToCafeInfo\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"MetaViewerInfos\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerInfo\",\"relationName\":\"CafeInfoToMetaViewerInfo\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Products\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Product\",\"relationName\":\"CafeInfoToProduct\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeThumbnailImage\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"thumbnailUrl\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"width\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"height\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"priority\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeInfoToCafeThumbnailImage\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeVirtualImage\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"width\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"height\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"priority\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeInfoToCafeVirtualImage\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeRealImage\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"width\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"height\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"priority\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeInfoToCafeRealImage\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeVirtualLink\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"type\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAvaliable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeInfoToCafeVirtualLink\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeVirtualLinkThumbnailImage\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeVirtualLinkThumbnailImage\",\"relationName\":\"CafeVirtualLinkToCafeVirtualLinkThumbnailImage\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeVirtualLinkThumbnailImage\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"width\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"height\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeVirtualLinkId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeVirtualLink\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeVirtualLink\",\"relationName\":\"CafeVirtualLinkToCafeVirtualLinkThumbnailImage\",\"relationFromFields\":[\"cafeVirtualLinkId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeCouponGroup\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tag\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"issuanceStartDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"issuanceEndDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCoupons\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCoupon\",\"relationName\":\"CafeCouponToCafeCouponGroup\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCouponGoupPartners\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponGoupPartner\",\"relationName\":\"CafeCouponGoupPartnerToCafeCouponGroup\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeCouponGoupPartner\",\"dbName\":null,\"fields\":[{\"name\":\"cafeCouponGroupId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCouponGroup\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponGroup\",\"relationName\":\"CafeCouponGoupPartnerToCafeCouponGroup\",\"relationFromFields\":[\"cafeCouponGroupId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeCouponGoupPartnerToCafeInfo\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"cafeCouponGroupId\",\"cafeInfoId\"]],\"uniqueIndexes\":[{\"name\":\"cafeCouponGroupPartnerUnique\",\"fields\":[\"cafeCouponGroupId\",\"cafeInfoId\"]}],\"isGenerated\":false},{\"name\":\"ProxyUser\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"memberId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"proxyUserType\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProxyUserType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"token\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"User\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"ProxyUserToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCoupons\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCoupon\",\"relationName\":\"CafeCouponToProxyUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"WishlistProducts\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"WishlistProduct\",\"relationName\":\"ProxyUserToWishlistProduct\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"memberId\",\"proxyUserType\"]],\"uniqueIndexes\":[{\"name\":\"proxyUserUnique\",\"fields\":[\"memberId\",\"proxyUserType\"]}],\"isGenerated\":false},{\"name\":\"CafeCoupon\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"content\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"serialNumber\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"endDay\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"proxyUserId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ProxyUser\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProxyUser\",\"relationName\":\"CafeCouponToProxyUser\",\"relationFromFields\":[\"proxyUserId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeCouponGroupId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCouponGroup\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponGroup\",\"relationName\":\"CafeCouponToCafeCouponGroup\",\"relationFromFields\":[\"cafeCouponGroupId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCouponQRCodes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponQRCode\",\"relationName\":\"CafeCouponToCafeCouponQRCode\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCouponHistories\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponHistory\",\"relationName\":\"CafeCouponToCafeCouponHistory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeCouponHistory\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeCouponId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCoupon\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCoupon\",\"relationName\":\"CafeCouponToCafeCouponHistory\",\"relationFromFields\":[\"cafeCouponId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"eventType\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponEventType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actorId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Actor\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"CafeCouponHistoryToUser\",\"relationFromFields\":[\"actorId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"statusBefore\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponStatus\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"statusAfter\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCouponStatus\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"CafeCouponQRCode\",\"dbName\":null,\"fields\":[{\"name\":\"serialNumber\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeCouponId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeCoupon\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeCoupon\",\"relationName\":\"CafeCouponToCafeCouponQRCode\",\"relationFromFields\":[\"cafeCouponId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"base64Data\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"MetaViewerInfo\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"worldData\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeInfoToMetaViewerInfo\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"MetaViewerMaps\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerMap\",\"relationName\":\"MetaViewerInfoToMetaViewerMap\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ActiveMaps\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerActiveMap\",\"relationName\":\"MetaViewerActiveMapToMetaViewerInfo\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"MetaViewerMap\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"type\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaMapType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"version\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Float\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"contentKey\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDraco\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Boolean\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metaViewerInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"MetaViewerInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerInfo\",\"relationName\":\"MetaViewerInfoToMetaViewerMap\",\"relationFromFields\":[\"metaViewerInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ActiveRenderFor\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerActiveMap\",\"relationName\":\"ActiveRender\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ActiveColliderFor\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerActiveMap\",\"relationName\":\"ActiveCollider\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"MetaViewerActiveMap\",\"dbName\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"metaViewerInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"MetaViewerInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerInfo\",\"relationName\":\"MetaViewerActiveMapToMetaViewerInfo\",\"relationFromFields\":[\"metaViewerInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activeRenderMapId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ActiveRenderMap\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerMap\",\"relationName\":\"ActiveRender\",\"relationFromFields\":[\"activeRenderMapId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activeColliderMapId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ActiveColliderMap\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetaViewerMap\",\"relationName\":\"ActiveCollider\",\"relationFromFields\":[\"activeColliderMapId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"ProductCategory\",\"dbName\":\"product_categories\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"AncestorCategories\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ClosureProductCategory\",\"relationName\":\"AncestorProductCategory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"DescendantCategories\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ClosureProductCategory\",\"relationName\":\"DescendantProductCategory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Products\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Product\",\"relationName\":\"ProductToProductCategory\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"ClosureProductCategory\",\"dbName\":\"closure_product_categories\",\"fields\":[{\"name\":\"ancestor\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descendant\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"depth\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"AncestorCategory\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProductCategory\",\"relationName\":\"AncestorProductCategory\",\"relationFromFields\":[\"ancestor\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"DescendantCategory\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProductCategory\",\"relationName\":\"DescendantProductCategory\",\"relationFromFields\":[\"descendant\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"ancestor\",\"descendant\",\"depth\"]],\"uniqueIndexes\":[{\"name\":\"productCategoryTreeUnique\",\"fields\":[\"ancestor\",\"descendant\",\"depth\"]}],\"isGenerated\":false},{\"name\":\"Product\",\"dbName\":\"products\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"price\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"originalPrice\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"stockQuantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"minOrderQuantity\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":1,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAvailable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"categoryId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ProductCategory\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProductCategory\",\"relationName\":\"ProductToProductCategory\",\"relationFromFields\":[\"categoryId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cafeInfoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"CafeInfo\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"CafeInfo\",\"relationName\":\"CafeInfoToProduct\",\"relationFromFields\":[\"cafeInfoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"WishlistProducts\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"WishlistProduct\",\"relationName\":\"ProductToWishlistProduct\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ProductImages\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProductImage\",\"relationName\":\"ProductToProductImage\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productRedirectUrl\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isSignature\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},{\"name\":\"WishlistProduct\",\"dbName\":\"wishlist_products\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Product\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Product\",\"relationName\":\"ProductToWishlistProduct\",\"relationFromFields\":[\"productId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"proxyUserId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ProxyUser\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ProxyUser\",\"relationName\":\"ProxyUserToWishlistProduct\",\"relationFromFields\":[\"proxyUserId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"productId\",\"proxyUserId\"]],\"uniqueIndexes\":[{\"name\":\"wishlistProductUnique\",\"fields\":[\"productId\",\"proxyUserId\"]}],\"isGenerated\":false},{\"name\":\"ProductImage\",\"dbName\":\"product_images\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":{\"name\":\"autoincrement\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"thumbnailUrl\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"width\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"height\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"size\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDisable\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isThumb\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"productId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"Product\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Product\",\"relationName\":\"ProductToProductImage\",\"relationFromFields\":[\"productId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}],\"types\":[]},\"mappings\":{\"modelOperations\":[{\"model\":\"User\",\"plural\":\"users\",\"findUnique\":\"findUniqueUser\",\"findUniqueOrThrow\":\"findUniqueUserOrThrow\",\"findFirst\":\"findFirstUser\",\"findFirstOrThrow\":\"findFirstUserOrThrow\",\"findMany\":\"findManyUser\",\"create\":\"createOneUser\",\"createMany\":\"createManyUser\",\"delete\":\"deleteOneUser\",\"update\":\"updateOneUser\",\"deleteMany\":\"deleteManyUser\",\"updateMany\":\"updateManyUser\",\"upsert\":\"upsertOneUser\",\"aggregate\":\"aggregateUser\",\"groupBy\":\"groupByUser\"},{\"model\":\"Notice\",\"plural\":\"notices\",\"findUnique\":\"findUniqueNotice\",\"findUniqueOrThrow\":\"findUniqueNoticeOrThrow\",\"findFirst\":\"findFirstNotice\",\"findFirstOrThrow\":\"findFirstNoticeOrThrow\",\"findMany\":\"findManyNotice\",\"create\":\"createOneNotice\",\"createMany\":\"createManyNotice\",\"delete\":\"deleteOneNotice\",\"update\":\"updateOneNotice\",\"deleteMany\":\"deleteManyNotice\",\"updateMany\":\"updateManyNotice\",\"upsert\":\"upsertOneNotice\",\"aggregate\":\"aggregateNotice\",\"groupBy\":\"groupByNotice\"},{\"model\":\"Board\",\"plural\":\"boards\",\"findUnique\":\"findUniqueBoard\",\"findUniqueOrThrow\":\"findUniqueBoardOrThrow\",\"findFirst\":\"findFirstBoard\",\"findFirstOrThrow\":\"findFirstBoardOrThrow\",\"findMany\":\"findManyBoard\",\"create\":\"createOneBoard\",\"createMany\":\"createManyBoard\",\"delete\":\"deleteOneBoard\",\"update\":\"updateOneBoard\",\"deleteMany\":\"deleteManyBoard\",\"updateMany\":\"updateManyBoard\",\"upsert\":\"upsertOneBoard\",\"aggregate\":\"aggregateBoard\",\"groupBy\":\"groupByBoard\"},{\"model\":\"BoardImage\",\"plural\":\"boardImages\",\"findUnique\":\"findUniqueBoardImage\",\"findUniqueOrThrow\":\"findUniqueBoardImageOrThrow\",\"findFirst\":\"findFirstBoardImage\",\"findFirstOrThrow\":\"findFirstBoardImageOrThrow\",\"findMany\":\"findManyBoardImage\",\"create\":\"createOneBoardImage\",\"createMany\":\"createManyBoardImage\",\"delete\":\"deleteOneBoardImage\",\"update\":\"updateOneBoardImage\",\"deleteMany\":\"deleteManyBoardImage\",\"updateMany\":\"updateManyBoardImage\",\"upsert\":\"upsertOneBoardImage\",\"aggregate\":\"aggregateBoardImage\",\"groupBy\":\"groupByBoardImage\"},{\"model\":\"BoardReply\",\"plural\":\"boardReplies\",\"findUnique\":\"findUniqueBoardReply\",\"findUniqueOrThrow\":\"findUniqueBoardReplyOrThrow\",\"findFirst\":\"findFirstBoardReply\",\"findFirstOrThrow\":\"findFirstBoardReplyOrThrow\",\"findMany\":\"findManyBoardReply\",\"create\":\"createOneBoardReply\",\"createMany\":\"createManyBoardReply\",\"delete\":\"deleteOneBoardReply\",\"update\":\"updateOneBoardReply\",\"deleteMany\":\"deleteManyBoardReply\",\"updateMany\":\"updateManyBoardReply\",\"upsert\":\"upsertOneBoardReply\",\"aggregate\":\"aggregateBoardReply\",\"groupBy\":\"groupByBoardReply\"},{\"model\":\"CafeBoard\",\"plural\":\"cafeBoards\",\"findUnique\":\"findUniqueCafeBoard\",\"findUniqueOrThrow\":\"findUniqueCafeBoardOrThrow\",\"findFirst\":\"findFirstCafeBoard\",\"findFirstOrThrow\":\"findFirstCafeBoardOrThrow\",\"findMany\":\"findManyCafeBoard\",\"create\":\"createOneCafeBoard\",\"createMany\":\"createManyCafeBoard\",\"delete\":\"deleteOneCafeBoard\",\"update\":\"updateOneCafeBoard\",\"deleteMany\":\"deleteManyCafeBoard\",\"updateMany\":\"updateManyCafeBoard\",\"upsert\":\"upsertOneCafeBoard\",\"aggregate\":\"aggregateCafeBoard\",\"groupBy\":\"groupByCafeBoard\"},{\"model\":\"RegionCategory\",\"plural\":\"regionCategories\",\"findUnique\":\"findUniqueRegionCategory\",\"findUniqueOrThrow\":\"findUniqueRegionCategoryOrThrow\",\"findFirst\":\"findFirstRegionCategory\",\"findFirstOrThrow\":\"findFirstRegionCategoryOrThrow\",\"findMany\":\"findManyRegionCategory\",\"create\":\"createOneRegionCategory\",\"createMany\":\"createManyRegionCategory\",\"delete\":\"deleteOneRegionCategory\",\"update\":\"updateOneRegionCategory\",\"deleteMany\":\"deleteManyRegionCategory\",\"updateMany\":\"updateManyRegionCategory\",\"upsert\":\"upsertOneRegionCategory\",\"aggregate\":\"aggregateRegionCategory\",\"groupBy\":\"groupByRegionCategory\"},{\"model\":\"ClosureRegionCategory\",\"plural\":\"closureRegionCategories\",\"findUnique\":\"findUniqueClosureRegionCategory\",\"findUniqueOrThrow\":\"findUniqueClosureRegionCategoryOrThrow\",\"findFirst\":\"findFirstClosureRegionCategory\",\"findFirstOrThrow\":\"findFirstClosureRegionCategoryOrThrow\",\"findMany\":\"findManyClosureRegionCategory\",\"create\":\"createOneClosureRegionCategory\",\"createMany\":\"createManyClosureRegionCategory\",\"delete\":\"deleteOneClosureRegionCategory\",\"update\":\"updateOneClosureRegionCategory\",\"deleteMany\":\"deleteManyClosureRegionCategory\",\"updateMany\":\"updateManyClosureRegionCategory\",\"upsert\":\"upsertOneClosureRegionCategory\",\"aggregate\":\"aggregateClosureRegionCategory\",\"groupBy\":\"groupByClosureRegionCategory\"},{\"model\":\"CafeInfo\",\"plural\":\"cafeInfos\",\"findUnique\":\"findUniqueCafeInfo\",\"findUniqueOrThrow\":\"findUniqueCafeInfoOrThrow\",\"findFirst\":\"findFirstCafeInfo\",\"findFirstOrThrow\":\"findFirstCafeInfoOrThrow\",\"findMany\":\"findManyCafeInfo\",\"create\":\"createOneCafeInfo\",\"createMany\":\"createManyCafeInfo\",\"delete\":\"deleteOneCafeInfo\",\"update\":\"updateOneCafeInfo\",\"deleteMany\":\"deleteManyCafeInfo\",\"updateMany\":\"updateManyCafeInfo\",\"upsert\":\"upsertOneCafeInfo\",\"aggregate\":\"aggregateCafeInfo\",\"groupBy\":\"groupByCafeInfo\"},{\"model\":\"CafeThumbnailImage\",\"plural\":\"cafeThumbnailImages\",\"findUnique\":\"findUniqueCafeThumbnailImage\",\"findUniqueOrThrow\":\"findUniqueCafeThumbnailImageOrThrow\",\"findFirst\":\"findFirstCafeThumbnailImage\",\"findFirstOrThrow\":\"findFirstCafeThumbnailImageOrThrow\",\"findMany\":\"findManyCafeThumbnailImage\",\"create\":\"createOneCafeThumbnailImage\",\"createMany\":\"createManyCafeThumbnailImage\",\"delete\":\"deleteOneCafeThumbnailImage\",\"update\":\"updateOneCafeThumbnailImage\",\"deleteMany\":\"deleteManyCafeThumbnailImage\",\"updateMany\":\"updateManyCafeThumbnailImage\",\"upsert\":\"upsertOneCafeThumbnailImage\",\"aggregate\":\"aggregateCafeThumbnailImage\",\"groupBy\":\"groupByCafeThumbnailImage\"},{\"model\":\"CafeVirtualImage\",\"plural\":\"cafeVirtualImages\",\"findUnique\":\"findUniqueCafeVirtualImage\",\"findUniqueOrThrow\":\"findUniqueCafeVirtualImageOrThrow\",\"findFirst\":\"findFirstCafeVirtualImage\",\"findFirstOrThrow\":\"findFirstCafeVirtualImageOrThrow\",\"findMany\":\"findManyCafeVirtualImage\",\"create\":\"createOneCafeVirtualImage\",\"createMany\":\"createManyCafeVirtualImage\",\"delete\":\"deleteOneCafeVirtualImage\",\"update\":\"updateOneCafeVirtualImage\",\"deleteMany\":\"deleteManyCafeVirtualImage\",\"updateMany\":\"updateManyCafeVirtualImage\",\"upsert\":\"upsertOneCafeVirtualImage\",\"aggregate\":\"aggregateCafeVirtualImage\",\"groupBy\":\"groupByCafeVirtualImage\"},{\"model\":\"CafeRealImage\",\"plural\":\"cafeRealImages\",\"findUnique\":\"findUniqueCafeRealImage\",\"findUniqueOrThrow\":\"findUniqueCafeRealImageOrThrow\",\"findFirst\":\"findFirstCafeRealImage\",\"findFirstOrThrow\":\"findFirstCafeRealImageOrThrow\",\"findMany\":\"findManyCafeRealImage\",\"create\":\"createOneCafeRealImage\",\"createMany\":\"createManyCafeRealImage\",\"delete\":\"deleteOneCafeRealImage\",\"update\":\"updateOneCafeRealImage\",\"deleteMany\":\"deleteManyCafeRealImage\",\"updateMany\":\"updateManyCafeRealImage\",\"upsert\":\"upsertOneCafeRealImage\",\"aggregate\":\"aggregateCafeRealImage\",\"groupBy\":\"groupByCafeRealImage\"},{\"model\":\"CafeVirtualLink\",\"plural\":\"cafeVirtualLinks\",\"findUnique\":\"findUniqueCafeVirtualLink\",\"findUniqueOrThrow\":\"findUniqueCafeVirtualLinkOrThrow\",\"findFirst\":\"findFirstCafeVirtualLink\",\"findFirstOrThrow\":\"findFirstCafeVirtualLinkOrThrow\",\"findMany\":\"findManyCafeVirtualLink\",\"create\":\"createOneCafeVirtualLink\",\"createMany\":\"createManyCafeVirtualLink\",\"delete\":\"deleteOneCafeVirtualLink\",\"update\":\"updateOneCafeVirtualLink\",\"deleteMany\":\"deleteManyCafeVirtualLink\",\"updateMany\":\"updateManyCafeVirtualLink\",\"upsert\":\"upsertOneCafeVirtualLink\",\"aggregate\":\"aggregateCafeVirtualLink\",\"groupBy\":\"groupByCafeVirtualLink\"},{\"model\":\"CafeVirtualLinkThumbnailImage\",\"plural\":\"cafeVirtualLinkThumbnailImages\",\"findUnique\":\"findUniqueCafeVirtualLinkThumbnailImage\",\"findUniqueOrThrow\":\"findUniqueCafeVirtualLinkThumbnailImageOrThrow\",\"findFirst\":\"findFirstCafeVirtualLinkThumbnailImage\",\"findFirstOrThrow\":\"findFirstCafeVirtualLinkThumbnailImageOrThrow\",\"findMany\":\"findManyCafeVirtualLinkThumbnailImage\",\"create\":\"createOneCafeVirtualLinkThumbnailImage\",\"createMany\":\"createManyCafeVirtualLinkThumbnailImage\",\"delete\":\"deleteOneCafeVirtualLinkThumbnailImage\",\"update\":\"updateOneCafeVirtualLinkThumbnailImage\",\"deleteMany\":\"deleteManyCafeVirtualLinkThumbnailImage\",\"updateMany\":\"updateManyCafeVirtualLinkThumbnailImage\",\"upsert\":\"upsertOneCafeVirtualLinkThumbnailImage\",\"aggregate\":\"aggregateCafeVirtualLinkThumbnailImage\",\"groupBy\":\"groupByCafeVirtualLinkThumbnailImage\"},{\"model\":\"CafeCouponGroup\",\"plural\":\"cafeCouponGroups\",\"findUnique\":\"findUniqueCafeCouponGroup\",\"findUniqueOrThrow\":\"findUniqueCafeCouponGroupOrThrow\",\"findFirst\":\"findFirstCafeCouponGroup\",\"findFirstOrThrow\":\"findFirstCafeCouponGroupOrThrow\",\"findMany\":\"findManyCafeCouponGroup\",\"create\":\"createOneCafeCouponGroup\",\"createMany\":\"createManyCafeCouponGroup\",\"delete\":\"deleteOneCafeCouponGroup\",\"update\":\"updateOneCafeCouponGroup\",\"deleteMany\":\"deleteManyCafeCouponGroup\",\"updateMany\":\"updateManyCafeCouponGroup\",\"upsert\":\"upsertOneCafeCouponGroup\",\"aggregate\":\"aggregateCafeCouponGroup\",\"groupBy\":\"groupByCafeCouponGroup\"},{\"model\":\"CafeCouponGoupPartner\",\"plural\":\"cafeCouponGoupPartners\",\"findUnique\":\"findUniqueCafeCouponGoupPartner\",\"findUniqueOrThrow\":\"findUniqueCafeCouponGoupPartnerOrThrow\",\"findFirst\":\"findFirstCafeCouponGoupPartner\",\"findFirstOrThrow\":\"findFirstCafeCouponGoupPartnerOrThrow\",\"findMany\":\"findManyCafeCouponGoupPartner\",\"create\":\"createOneCafeCouponGoupPartner\",\"createMany\":\"createManyCafeCouponGoupPartner\",\"delete\":\"deleteOneCafeCouponGoupPartner\",\"update\":\"updateOneCafeCouponGoupPartner\",\"deleteMany\":\"deleteManyCafeCouponGoupPartner\",\"updateMany\":\"updateManyCafeCouponGoupPartner\",\"upsert\":\"upsertOneCafeCouponGoupPartner\",\"aggregate\":\"aggregateCafeCouponGoupPartner\",\"groupBy\":\"groupByCafeCouponGoupPartner\"},{\"model\":\"ProxyUser\",\"plural\":\"proxyUsers\",\"findUnique\":\"findUniqueProxyUser\",\"findUniqueOrThrow\":\"findUniqueProxyUserOrThrow\",\"findFirst\":\"findFirstProxyUser\",\"findFirstOrThrow\":\"findFirstProxyUserOrThrow\",\"findMany\":\"findManyProxyUser\",\"create\":\"createOneProxyUser\",\"createMany\":\"createManyProxyUser\",\"delete\":\"deleteOneProxyUser\",\"update\":\"updateOneProxyUser\",\"deleteMany\":\"deleteManyProxyUser\",\"updateMany\":\"updateManyProxyUser\",\"upsert\":\"upsertOneProxyUser\",\"aggregate\":\"aggregateProxyUser\",\"groupBy\":\"groupByProxyUser\"},{\"model\":\"CafeCoupon\",\"plural\":\"cafeCoupons\",\"findUnique\":\"findUniqueCafeCoupon\",\"findUniqueOrThrow\":\"findUniqueCafeCouponOrThrow\",\"findFirst\":\"findFirstCafeCoupon\",\"findFirstOrThrow\":\"findFirstCafeCouponOrThrow\",\"findMany\":\"findManyCafeCoupon\",\"create\":\"createOneCafeCoupon\",\"createMany\":\"createManyCafeCoupon\",\"delete\":\"deleteOneCafeCoupon\",\"update\":\"updateOneCafeCoupon\",\"deleteMany\":\"deleteManyCafeCoupon\",\"updateMany\":\"updateManyCafeCoupon\",\"upsert\":\"upsertOneCafeCoupon\",\"aggregate\":\"aggregateCafeCoupon\",\"groupBy\":\"groupByCafeCoupon\"},{\"model\":\"CafeCouponHistory\",\"plural\":\"cafeCouponHistories\",\"findUnique\":\"findUniqueCafeCouponHistory\",\"findUniqueOrThrow\":\"findUniqueCafeCouponHistoryOrThrow\",\"findFirst\":\"findFirstCafeCouponHistory\",\"findFirstOrThrow\":\"findFirstCafeCouponHistoryOrThrow\",\"findMany\":\"findManyCafeCouponHistory\",\"create\":\"createOneCafeCouponHistory\",\"createMany\":\"createManyCafeCouponHistory\",\"delete\":\"deleteOneCafeCouponHistory\",\"update\":\"updateOneCafeCouponHistory\",\"deleteMany\":\"deleteManyCafeCouponHistory\",\"updateMany\":\"updateManyCafeCouponHistory\",\"upsert\":\"upsertOneCafeCouponHistory\",\"aggregate\":\"aggregateCafeCouponHistory\",\"groupBy\":\"groupByCafeCouponHistory\"},{\"model\":\"CafeCouponQRCode\",\"plural\":\"cafeCouponQRCodes\",\"findUnique\":\"findUniqueCafeCouponQRCode\",\"findUniqueOrThrow\":\"findUniqueCafeCouponQRCodeOrThrow\",\"findFirst\":\"findFirstCafeCouponQRCode\",\"findFirstOrThrow\":\"findFirstCafeCouponQRCodeOrThrow\",\"findMany\":\"findManyCafeCouponQRCode\",\"create\":\"createOneCafeCouponQRCode\",\"createMany\":\"createManyCafeCouponQRCode\",\"delete\":\"deleteOneCafeCouponQRCode\",\"update\":\"updateOneCafeCouponQRCode\",\"deleteMany\":\"deleteManyCafeCouponQRCode\",\"updateMany\":\"updateManyCafeCouponQRCode\",\"upsert\":\"upsertOneCafeCouponQRCode\",\"aggregate\":\"aggregateCafeCouponQRCode\",\"groupBy\":\"groupByCafeCouponQRCode\"},{\"model\":\"MetaViewerInfo\",\"plural\":\"metaViewerInfos\",\"findUnique\":\"findUniqueMetaViewerInfo\",\"findUniqueOrThrow\":\"findUniqueMetaViewerInfoOrThrow\",\"findFirst\":\"findFirstMetaViewerInfo\",\"findFirstOrThrow\":\"findFirstMetaViewerInfoOrThrow\",\"findMany\":\"findManyMetaViewerInfo\",\"create\":\"createOneMetaViewerInfo\",\"createMany\":\"createManyMetaViewerInfo\",\"delete\":\"deleteOneMetaViewerInfo\",\"update\":\"updateOneMetaViewerInfo\",\"deleteMany\":\"deleteManyMetaViewerInfo\",\"updateMany\":\"updateManyMetaViewerInfo\",\"upsert\":\"upsertOneMetaViewerInfo\",\"aggregate\":\"aggregateMetaViewerInfo\",\"groupBy\":\"groupByMetaViewerInfo\"},{\"model\":\"MetaViewerMap\",\"plural\":\"metaViewerMaps\",\"findUnique\":\"findUniqueMetaViewerMap\",\"findUniqueOrThrow\":\"findUniqueMetaViewerMapOrThrow\",\"findFirst\":\"findFirstMetaViewerMap\",\"findFirstOrThrow\":\"findFirstMetaViewerMapOrThrow\",\"findMany\":\"findManyMetaViewerMap\",\"create\":\"createOneMetaViewerMap\",\"createMany\":\"createManyMetaViewerMap\",\"delete\":\"deleteOneMetaViewerMap\",\"update\":\"updateOneMetaViewerMap\",\"deleteMany\":\"deleteManyMetaViewerMap\",\"updateMany\":\"updateManyMetaViewerMap\",\"upsert\":\"upsertOneMetaViewerMap\",\"aggregate\":\"aggregateMetaViewerMap\",\"groupBy\":\"groupByMetaViewerMap\"},{\"model\":\"MetaViewerActiveMap\",\"plural\":\"metaViewerActiveMaps\",\"findUnique\":\"findUniqueMetaViewerActiveMap\",\"findUniqueOrThrow\":\"findUniqueMetaViewerActiveMapOrThrow\",\"findFirst\":\"findFirstMetaViewerActiveMap\",\"findFirstOrThrow\":\"findFirstMetaViewerActiveMapOrThrow\",\"findMany\":\"findManyMetaViewerActiveMap\",\"create\":\"createOneMetaViewerActiveMap\",\"createMany\":\"createManyMetaViewerActiveMap\",\"delete\":\"deleteOneMetaViewerActiveMap\",\"update\":\"updateOneMetaViewerActiveMap\",\"deleteMany\":\"deleteManyMetaViewerActiveMap\",\"updateMany\":\"updateManyMetaViewerActiveMap\",\"upsert\":\"upsertOneMetaViewerActiveMap\",\"aggregate\":\"aggregateMetaViewerActiveMap\",\"groupBy\":\"groupByMetaViewerActiveMap\"},{\"model\":\"ProductCategory\",\"plural\":\"productCategories\",\"findUnique\":\"findUniqueProductCategory\",\"findUniqueOrThrow\":\"findUniqueProductCategoryOrThrow\",\"findFirst\":\"findFirstProductCategory\",\"findFirstOrThrow\":\"findFirstProductCategoryOrThrow\",\"findMany\":\"findManyProductCategory\",\"create\":\"createOneProductCategory\",\"createMany\":\"createManyProductCategory\",\"delete\":\"deleteOneProductCategory\",\"update\":\"updateOneProductCategory\",\"deleteMany\":\"deleteManyProductCategory\",\"updateMany\":\"updateManyProductCategory\",\"upsert\":\"upsertOneProductCategory\",\"aggregate\":\"aggregateProductCategory\",\"groupBy\":\"groupByProductCategory\"},{\"model\":\"ClosureProductCategory\",\"plural\":\"closureProductCategories\",\"findUnique\":\"findUniqueClosureProductCategory\",\"findUniqueOrThrow\":\"findUniqueClosureProductCategoryOrThrow\",\"findFirst\":\"findFirstClosureProductCategory\",\"findFirstOrThrow\":\"findFirstClosureProductCategoryOrThrow\",\"findMany\":\"findManyClosureProductCategory\",\"create\":\"createOneClosureProductCategory\",\"createMany\":\"createManyClosureProductCategory\",\"delete\":\"deleteOneClosureProductCategory\",\"update\":\"updateOneClosureProductCategory\",\"deleteMany\":\"deleteManyClosureProductCategory\",\"updateMany\":\"updateManyClosureProductCategory\",\"upsert\":\"upsertOneClosureProductCategory\",\"aggregate\":\"aggregateClosureProductCategory\",\"groupBy\":\"groupByClosureProductCategory\"},{\"model\":\"Product\",\"plural\":\"products\",\"findUnique\":\"findUniqueProduct\",\"findUniqueOrThrow\":\"findUniqueProductOrThrow\",\"findFirst\":\"findFirstProduct\",\"findFirstOrThrow\":\"findFirstProductOrThrow\",\"findMany\":\"findManyProduct\",\"create\":\"createOneProduct\",\"createMany\":\"createManyProduct\",\"delete\":\"deleteOneProduct\",\"update\":\"updateOneProduct\",\"deleteMany\":\"deleteManyProduct\",\"updateMany\":\"updateManyProduct\",\"upsert\":\"upsertOneProduct\",\"aggregate\":\"aggregateProduct\",\"groupBy\":\"groupByProduct\"},{\"model\":\"WishlistProduct\",\"plural\":\"wishlistProducts\",\"findUnique\":\"findUniqueWishlistProduct\",\"findUniqueOrThrow\":\"findUniqueWishlistProductOrThrow\",\"findFirst\":\"findFirstWishlistProduct\",\"findFirstOrThrow\":\"findFirstWishlistProductOrThrow\",\"findMany\":\"findManyWishlistProduct\",\"create\":\"createOneWishlistProduct\",\"createMany\":\"createManyWishlistProduct\",\"delete\":\"deleteOneWishlistProduct\",\"update\":\"updateOneWishlistProduct\",\"deleteMany\":\"deleteManyWishlistProduct\",\"updateMany\":\"updateManyWishlistProduct\",\"upsert\":\"upsertOneWishlistProduct\",\"aggregate\":\"aggregateWishlistProduct\",\"groupBy\":\"groupByWishlistProduct\"},{\"model\":\"ProductImage\",\"plural\":\"productImages\",\"findUnique\":\"findUniqueProductImage\",\"findUniqueOrThrow\":\"findUniqueProductImageOrThrow\",\"findFirst\":\"findFirstProductImage\",\"findFirstOrThrow\":\"findFirstProductImageOrThrow\",\"findMany\":\"findManyProductImage\",\"create\":\"createOneProductImage\",\"createMany\":\"createManyProductImage\",\"delete\":\"deleteOneProductImage\",\"update\":\"updateOneProductImage\",\"deleteMany\":\"deleteManyProductImage\",\"updateMany\":\"updateManyProductImage\",\"upsert\":\"upsertOneProductImage\",\"aggregate\":\"aggregateProductImage\",\"groupBy\":\"groupByProductImage\"}],\"otherOperations\":{\"read\":[],\"write\":[\"executeRaw\",\"queryRaw\"]}}}"
const dmmf = JSON.parse(dmmfString)
exports.Prisma.dmmf = JSON.parse(dmmfString)

/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "C:\\Users\\psbsa\\Documents\\junseo\\web_application\\virtual_cafe\\virtualcafe-was-repo\\mecipe-was\\prisma\\basic",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [],
    "previewFeatures": [],
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": "..\\..\\.env",
    "schemaEnvPath": "..\\..\\.env"
  },
  "relativePath": "..",
  "clientVersion": "4.7.0",
  "engineVersion": "39190b250ebc338586e25e6da45e5e783bc8a635",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "dataProxy": false
}
config.document = dmmf
config.dirname = dirname




const { warnEnvConflicts } = require('./runtime/index')

warnEnvConflicts({
    rootEnvPath: config.relativeEnvPaths.rootEnvPath && path.resolve(dirname, config.relativeEnvPaths.rootEnvPath),
    schemaEnvPath: config.relativeEnvPaths.schemaEnvPath && path.resolve(dirname, config.relativeEnvPaths.schemaEnvPath)
})

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

path.join(__dirname, "query_engine-windows.dll.node");
path.join(process.cwd(), "prisma\\basic\\query_engine-windows.dll.node")
path.join(__dirname, "schema.prisma");
path.join(process.cwd(), "prisma\\basic\\schema.prisma")
