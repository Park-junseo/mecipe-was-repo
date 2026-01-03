// Common constants
export const KAFKA_TOPICS = {
  CAFE_INFO_CREATED: 'cafe-info.created',
  CAFE_INFO_UPDATED: 'cafe-info.updated',
  CAFE_INFO_DELETED: 'cafe-info.deleted',
  META_VIEWER_INFO_CREATED: 'meta-viewer-info.created',
  META_VIEWER_INFO_UPDATED: 'meta-viewer-info.updated',
  META_VIEWER_INFO_DELETED: 'meta-viewer-info.deleted',
} as const;

export const SERVICE_NAMES = {
  META_VIEWER_SERVICE: 'meta-viewer-service',
  PLACE_API_SERVICE: 'place-api-service',
  PLACE_INDEXER_SERVICE: 'place-indexer-service',
} as const;





