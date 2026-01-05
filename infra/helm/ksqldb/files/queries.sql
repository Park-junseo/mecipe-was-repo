
-- Global settings
SET 'auto.offset.reset' = 'earliest';
-- =========================================
-- 1. CafeInfo CDC STREAM (Debezium 원본)
-- =========================================
CREATE STREAM IF NOT EXISTS stream_cafe_info (
  before STRUCT < id BIGINT,
  "createdAt" BIGINT,
  "isDisable" BOOLEAN,
  name VARCHAR,
  code VARCHAR,
  "regionCategoryId" BIGINT,
  address VARCHAR,
  directions VARCHAR,
  "businessNumber" VARCHAR,
  "ceoName" VARCHAR >,
  after STRUCT < id BIGINT,
  "createdAt" BIGINT,
  "isDisable" BOOLEAN,
  name VARCHAR,
  code VARCHAR,
  "regionCategoryId" BIGINT,
  address VARCHAR,
  directions VARCHAR,
  "businessNumber" VARCHAR,
  "ceoName" VARCHAR >,
  op VARCHAR,
  ts_ms BIGINT
) WITH (
  KAFKA_TOPIC = 'dbserver.public.CafeInfo',
  VALUE_FORMAT = 'JSON',
  KEY_FORMAT = 'JSON'
);
-- =========================================
-- 2. CafeInfo 평탄화 STREAM (PK = id)
-- =========================================
CREATE STREAM IF NOT EXISTS stream_cafe_info_extracted
WITH (KEY_FORMAT = 'JSON') AS
SELECT COALESCE(
    after->id,
      before->id
  ) AS id,
  COALESCE(
    after->"createdAt",
      before->"createdAt"
  ) AS "createdAt",
  COALESCE(
    after->"isDisable",
      before->"isDisable"
  ) AS "isDisable",
  COALESCE(
    after->name,
      before->name
  ) AS name,
  COALESCE(
    after->code,
      before->code
  ) AS code,
  COALESCE(
    after->"regionCategoryId",
      before->"regionCategoryId"
  ) AS "regionCategoryId",
  COALESCE(
    after->address,
      before->address
  ) AS address,
  COALESCE(
    after->directions,
      before->directions
  ) AS directions,
  COALESCE(
    after->"businessNumber",
      before->"businessNumber"
  ) AS "businessNumber",
  COALESCE(
    after->"ceoName",
      before->"ceoName"
  ) AS "ceoName",
  op,
  before,
  after,
  ts_ms
FROM stream_cafe_info
WHERE after IS NOT NULL OR before IS NOT NULL
PARTITION BY COALESCE(after->id, before->id)
EMIT CHANGES;
-- =========================================
-- 3. CafeInfo TABLE (KEY = id)
-- =========================================
CREATE TABLE IF NOT EXISTS tbl_cafe_info AS
SELECT id,
  LATEST_BY_OFFSET("createdAt") AS "createdAt",
  LATEST_BY_OFFSET("isDisable") AS "isDisable",
  LATEST_BY_OFFSET(name) AS name,
  LATEST_BY_OFFSET(code) AS code,
  LATEST_BY_OFFSET("regionCategoryId") AS "regionCategoryId",
  LATEST_BY_OFFSET(address) AS address,
  LATEST_BY_OFFSET(directions) AS directions,
  LATEST_BY_OFFSET("businessNumber") AS "businessNumber",
  LATEST_BY_OFFSET("ceoName") AS "ceoName"
FROM stream_cafe_info_extracted
GROUP BY id EMIT CHANGES;
-- =========================================
-- 4. RegionCategory CDC STREAM
-- =========================================
CREATE STREAM IF NOT EXISTS stream_region_category (
  before STRUCT < id BIGINT,
  "createdAt" BIGINT,
  name VARCHAR,
  "isDisable" BOOLEAN,
  "govermentType" VARCHAR >,
  after STRUCT < id BIGINT,
  "createdAt" BIGINT,
  name VARCHAR,
  "isDisable" BOOLEAN,
  "govermentType" VARCHAR >,
  op VARCHAR,
  ts_ms BIGINT
) WITH (
  KAFKA_TOPIC = 'dbserver.public.RegionCategory',
  VALUE_FORMAT = 'JSON',
  KEY_FORMAT = 'JSON'
);
-- =========================================
-- 5. RegionCategory 평탄화 STREAM (PK = id)
-- =========================================
CREATE STREAM IF NOT EXISTS stream_region_category_extracted
WITH (KEY_FORMAT = 'JSON') AS
SELECT COALESCE(
    after->id,
    before->id
  ) AS id,
  COALESCE(
    after->"createdAt",
    before->"createdAt"
  ) AS "createdAt",
  COALESCE(
    after->name,
    before->name
  ) AS name,
  COALESCE(
    after->"isDisable",
    before->"isDisable"
  ) AS "isDisable",
  COALESCE(
    after->"govermentType",
    before->"govermentType"
  ) AS "govermentType",
  op,
  before,
  after,
  ts_ms
FROM stream_region_category
WHERE after IS NOT NULL OR before IS NOT NULL
PARTITION BY COALESCE(after->id, before->id)
EMIT CHANGES;
-- =========================================
-- 6. RegionCategory TABLE (KEY = id)
-- =========================================
CREATE TABLE IF NOT EXISTS tbl_region_category AS
SELECT id,
  LATEST_BY_OFFSET("createdAt") AS "createdAt",
  LATEST_BY_OFFSET(name) AS name,
  LATEST_BY_OFFSET("isDisable") AS "isDisable",
  LATEST_BY_OFFSET("govermentType") AS "govermentType"
FROM stream_region_category_extracted
GROUP BY id EMIT CHANGES;
-- =========================================
-- 7. CafeInfo TABLE ↔ RegionCategory TABLE JOIN
-- =========================================
CREATE TABLE IF NOT EXISTS mv_cafe_info_with_region WITH (KAFKA_TOPIC = 'mv_cafe_info_with_region') AS
SELECT ci.id AS "id",
  ci."createdAt" AS "createdAt",
  ci."isDisable" AS "isDisable",
  ci.name AS "name",
  ci.code AS "code",
  ci."regionCategoryId" AS "regionCategoryId",
  ci.address AS "address",
  ci.directions AS "directions",
  ci."businessNumber" AS "businessNumber",
  ci."ceoName" AS "ceoName",
  STRUCT(
    "id" := rc.id,
    "createdAt" := rc."createdAt",
    "name" := rc.name,
    "isDisable" := rc."isDisable",
    "govermentType" := rc."govermentType"
  ) AS "RegionCategory"
FROM tbl_cafe_info ci
  INNER JOIN tbl_region_category rc ON ci."regionCategoryId" = rc.id EMIT CHANGES;