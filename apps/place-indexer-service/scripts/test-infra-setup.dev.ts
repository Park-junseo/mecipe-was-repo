// npm run start:test -- --start-app --exclude:postgres --region-url:http://localhost:4000/regioncategories --postgres:host.docker.internal:32769:testuser:testpassword:testdb
import {
  StartedPostgreSqlContainer,
  PostgreSqlContainer,
} from '@testcontainers/postgresql';
// import { KafkaContainer } from '@testcontainers/kafka';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
  Wait,
} from 'testcontainers';
import { ElasticsearchContainer } from '@testcontainers/elasticsearch';
import { getCommandParameters } from './utils/get-command-parapmeter';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';

let postgres: StartedPostgreSqlContainer | undefined;
let kafka: StartedTestContainer | undefined;
let kafkaUrl: string | undefined;
let kafkaInternalBootstrapServer: string | undefined;
let connect: StartedTestContainer | undefined;
let elastic: StartedTestContainer | undefined;
let elasticUrl: string | undefined;
let internalElasticsearchUrl: string | undefined;
let kafkaUi: StartedTestContainer | undefined;
let kafkaUiUrl: string | undefined;
let kibana: StartedTestContainer | undefined;
let kibanaUrl: string | undefined;
let ksqlDb: StartedTestContainer | undefined;
let nestProcess: ChildProcess | undefined;

let network: StartedNetwork | undefined;

const KAFKA_HOST_NAME = 'mecipe-test-kafka';
const ELASTICSEARCH_HOST_NAME = 'mecipe-test-elasticsearch';
const POSTGRES_HOST_NAME = 'mecipe-test-postgres';
const DEBEZIUM_HOST_NAME = 'mecipe-test-debezium';
const KAFKA_UI_HOST_NAME = 'mecipe-test-kafka-ui';
const KIBANA_HOST_NAME = 'mecipe-test-kibana';
const EXTERNAL_HOST_NAME = 'host.docker.internal'; // Docker Desktop 환경
const ELASTIC_USERNAME = 'elastic';
const ELASTIC_PASSWORD = 'elasticpassword';
const KSQLDB_HOST_NAME = 'mecipe-test-ksqldb';

// DEBEZIUM_POSTGRES_CONNECTOR_CONFIG 함수를 수정하여 host.docker.internal을 사용
// Testcontainers가 외부로 노출된 Postgres를 직접 제어하지 않으므로,
// PostgresHost는 Testcontainers 외부의 호스트 주소를 전달해야 함.
const DEBEZIUM_POSTGRES_CONNECTOR_CONFIG_FOR_EXTERNAL_DB = (
  dbHost: string = EXTERNAL_HOST_NAME, // 여기서는 'host.docker.internal'
  dbPort: string | number, // 여기서는 예:'32769'
  dbName: string,
  dbUser: string,
  dbPass: string,
) =>
  JSON.stringify({
    name: 'cafe-infos-debezium-connector',
    config: {
      'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
      'plugin.name': 'pgoutput',
      'tasks.max': '1',
      'database.hostname': dbHost, // ✨ host.docker.internal 사용!
      'database.port': dbPort, // ✨ 외부 노출된 포트 사용!
      'database.user': dbUser,
      'database.password': dbPass,
      'database.dbname': dbName,
      'database.server.name': 'dbserver',
      'topic.prefix': 'dbserver',
      'table.include.list': 'public.CafeInfo,public.RegionCategory',
      'publication.autocreate.mode': 'all_tables',
      'slot.name': 'debezium_slot',
      'heartbeat.interval.ms': '5000',
      'value.converter': 'org.apache.kafka.connect.json.JsonConverter',
      'value.converter.schemas.enable': 'false',
      'key.converter': 'org.apache.kafka.connect.json.JsonConverter',
      'key.converter.schemas.enable': 'false',
    },
  });

async function startPostgres(network: StartedNetwork) {
  console.log('🔄 Starting Postgres...');
  postgres = await new PostgreSqlContainer('debezium/postgres:16-alpine')
    .withNetwork(network)
    .withNetworkAliases(POSTGRES_HOST_NAME)
    .withEnvironment({
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      // PostgreSQL 설정 반영S
      POSTGRES_DB: 'mydb',
    })
    .start();
  console.log(
    '✅ Postgres started',
    `host: ${postgres?.getHost()}`,
    `port: ${postgres?.getMappedPort(5432).toString()}`,
  );
}

async function startKafka(network: StartedNetwork) {
  console.log('🔄 Starting Kafka...');
  kafkaInternalBootstrapServer = `${KAFKA_HOST_NAME}:29092`;

  // 고정 포트 사용: 동적 포트 할당 문제를 해결하기 위해
  // 호스트 OS의 9092 포트를 사용 (포트 포워딩)
  const FIXED_KAFKA_PORT = 9092;
  const host = 'localhost';
  const kafkaNodeId = 1;

  // KafkaContainer는 GenericContainer를 상속받으므로
  // withExposedPorts로 포트 바인딩(포트 포워딩) 설정 가능
  // 포트 바인딩 형식: { container: 9092, host: 9092 }
  const kafkaContainer = new GenericContainer('confluentinc/cp-kafka:7.5.0')
    .withNetwork(network)
    .withNetworkAliases(KAFKA_HOST_NAME)
    .withExposedPorts({
      container: 9092,
      host: FIXED_KAFKA_PORT,
    }); // 포트 포워딩: 호스트 9092 -> 컨테이너 9092

  // Kafka 시작
  kafka = await kafkaContainer
    .withEnvironment({
      KAFKA_NODE_ID: kafkaNodeId.toString(),
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP:
        'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT',
      KAFKA_ADVERTISED_LISTENERS: `PLAINTEXT://${KAFKA_HOST_NAME}:29092,PLAINTEXT_HOST://localhost:9092`,
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: '0',
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: '1',
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: '1',
      KAFKA_JMX_PORT: '9101',
      KAFKA_JMX_HOSTNAME: 'localhost',
      KAFKA_PROCESS_ROLES: 'broker,controller',
      KAFKA_CONTROLLER_QUORUM_VOTERS: `${kafkaNodeId}@${KAFKA_HOST_NAME}:29093`,
      KAFKA_LISTENERS: `PLAINTEXT://${KAFKA_HOST_NAME}:29092,CONTROLLER://${KAFKA_HOST_NAME}:29093,PLAINTEXT_HOST://0.0.0.0:9092`,
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT',
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER',
      KAFKA_LOG_DIRS: '/tmp/kraft-combined-logs',
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk',
    })
    .start();

  kafkaUrl = `PLAINTEXT://${host}:${FIXED_KAFKA_PORT}`;
  console.log('✅ Kafka started', `url: ${kafkaUrl}`);
  console.log(
    `   Internal (Docker network): ${kafkaInternalBootstrapServer}, External (Host OS): ${host}:${FIXED_KAFKA_PORT}`,
  );

  const kafkaHost = kafka?.getHost();
  const kafkaPort = kafka?.getMappedPort(9092);

  console.log(
    `   Port forwarding: ${kafkaHost}:${kafkaPort.toString()} -> ${host}:${FIXED_KAFKA_PORT}`,
  );

  // Kafka가 완전히 준비될 때까지 대기
  console.log('⏳ Waiting for Kafka to be fully ready...');
  await waitForKafkaReady(kafkaHost, kafkaPort, 60);
  console.log('✅ Kafka is ready to accept connections');
}

async function waitForKafkaReady(host: string, port: number, maxRetries = 30) {
  console.log(
    '🔄 Waiting for Kafka to be ready...',
    `host: ${host}, port: ${port}`,
  );
  const net = await import('net');
  for (let i = 0; i < maxRetries; i++) {
    const isReady = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 1000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      socket.connect(port, host);
    });

    if (isReady) {
      // 연결이 성공했어도 Kafka가 완전히 준비되려면 추가 시간이 필요할 수 있음
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Kafka at ${host}:${port} did not become ready within ${maxRetries} seconds`,
  );
}

async function startDebeziumConnect(
  network: StartedNetwork,
  options: {
    bootstrapServer: string;
    postgresHost: string;
    postgresPort: string;
    postgresUsername: string;
    postgresPassword: string;
    postgresDatabase: string;
  },
) {
  const {
    bootstrapServer,
    postgresHost,
    postgresPort,
    postgresUsername,
    postgresPassword,
    postgresDatabase,
  } = options;
  // Debezium Kafka Connect
  console.log('🔄 Starting Debezium Connect...');
  connect = await new GenericContainer('debezium/connect:2.6')
    .withNetwork(network)
    .withNetworkAliases(DEBEZIUM_HOST_NAME)
    .withEnvironment({
      BOOTSTRAP_SERVERS: bootstrapServer,
      GROUP_ID: '1',
      CONFIG_STORAGE_TOPIC: 'connect-configs',
      OFFSET_STORAGE_TOPIC: 'connect-offsets',
      STATUS_STORAGE_TOPIC: 'connect-status',
    })
    .withExposedPorts(8083)
    .withWaitStrategy(Wait.forHttp('/connectors', 8083).forStatusCode(200))
    .start();

  const connectUrl = `http://${connect?.getHost()}:${connect?.getMappedPort(8083).toString()}`;
  console.log('✅ Debezium Connect started', `url: ${connectUrl}`);

  console.log('🔄 Creating Debezium Connect connector...');
  const response = await fetch(`${connectUrl}/connectors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: DEBEZIUM_POSTGRES_CONNECTOR_CONFIG_FOR_EXTERNAL_DB(
      postgresHost,
      postgresPort,
      postgresDatabase,
      postgresUsername,
      postgresPassword,
    ),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Connector creation failed: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }
  console.log('✅ Debezium Connect connector created', await response.json());
}

async function startElasticsearch(network: StartedNetwork) {
  // Elasticsearch
  console.log('🔄 Starting Elasticsearch...');
  elastic = await new ElasticsearchContainer(
    'docker.elastic.co/elasticsearch/elasticsearch:8.14.0',
  )
    .withNetwork(network)
    .withNetworkAliases(ELASTICSEARCH_HOST_NAME)
    .withEnvironment({
      'discovery.type': 'single-node',
      'xpack.security.enabled': 'false',
      'xpack.security.http.ssl.enabled': 'false',
      ELASTIC_USERNAME,
      ELASTIC_PASSWORD,
    })
    .withExposedPorts({
      container: 9200,
      host: 9200,
    })
    .start();
  elasticUrl = `http://${elastic?.getHost()}:${elastic?.getMappedPort(9200).toString()}`;
  internalElasticsearchUrl = `http://${ELASTICSEARCH_HOST_NAME}:9200`;
  console.log('✅ Elasticsearch started', `url: ${elasticUrl}`);
}

async function startKibana(network: StartedNetwork, elasticUrl: string) {
  console.log('🔄 Starting Kibana...');
  const kibanaElasticsearchHosts = JSON.stringify([elasticUrl]);
  kibana = await new GenericContainer('docker.elastic.co/kibana/kibana:8.14.0')
    .withNetwork(network)
    .withNetworkAliases(KIBANA_HOST_NAME)
    .withEnvironment({
      ELASTICSEARCH_HOSTS: kibanaElasticsearchHosts,
    })
    .withExposedPorts(5601)
    .start();
  kibanaUrl = `http://${kibana?.getHost()}:${kibana?.getMappedPort(5601).toString()}`;
  console.log('✅ Kibana started', `url: ${kibanaUrl}`);
}

async function startKafkaUi(
  network: StartedNetwork,
  options: { kafkaBootstrapServer: string },
) {
  const { kafkaBootstrapServer } = options;
  console.log('🔄 Starting Kafka UI...');
  kafkaUi = await new GenericContainer('provectuslabs/kafka-ui:latest')
    .withNetwork(network)
    .withHostname(KAFKA_UI_HOST_NAME)
    .withEnvironment({
      KAFKA_CLUSTERS_0_NAME: 'local',
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafkaBootstrapServer,
      SERVER_PORT: '8080',
    })
    .withExposedPorts(8080)
    // .withWaitStrategy(Wait.forHttp('/actuator/health', 8080).forStatusCode(200))
    .start();
  kafkaUiUrl = `http://${kafkaUi?.getHost()}:${kafkaUi
    ?.getMappedPort(8080)
    .toString()}`;
  console.log('✅ Kafka UI started', `url: ${kafkaUiUrl}`);
}

async function startKSQLDB(
  network: StartedNetwork,
  bootstrapKafkaServer: string,
) {
  console.log('🔄 Starting KSQLDB...');
  // NOTE:
  // - 0.36.0 태그는 Docker Hub에 없음 → manifest unknown 404 에러 발생
  // - 테스트 환경에서는 유지보수되는 latest 태그를 사용
  ksqlDb = await new GenericContainer('confluentinc/ksqldb-server:latest')
    .withNetwork(network)
    .withNetworkAliases(KSQLDB_HOST_NAME)
    .withEnvironment({
      KSQL_LISTENERS: 'http://0.0.0.0:8088',
      KSQL_BOOTSTRAP_SERVERS: bootstrapKafkaServer,
      KSQL_KSQL_LOGGING_PROCESSING_STREAM_AUTO_CREATE: 'true',
      KSQL_KSQL_LOGGING_PROCESSING_TOPIC_AUTO_CREATE: 'true',
      KSQL_CONFIG_DIR: '/etc/ksqldb',
      KSQL_STREAMS_AUTO_OFFSET_RESET: 'earliest',
    })
    .withExposedPorts(8088)
    .withWaitStrategy(
      Wait.forHttp('/info', 8088).forStatusCode(200).withStartupTimeout(60000),
    )
    .start();
  const ksqlDbUrl = `http://${ksqlDb?.getHost()}:${ksqlDb
    ?.getMappedPort(8088)
    .toString()}`;
  console.log('✅ KSQLDB started', `url: ${ksqlDbUrl}`);

  // KSQLDB가 완전히 준비될 때까지 대기
  console.log('⏳ Waiting for KSQLDB to be fully ready...');
  await waitForKSQLDBReady(ksqlDbUrl, 60);
  console.log('✅ KSQLDB is ready to accept queries');

  // KSQL 쿼리 실행
  await setupKSQLQueries(ksqlDbUrl);
}

async function waitForKSQLDBReady(ksqlDbUrl: string, maxRetries = 60) {
  console.log('🔄 Waiting for KSQLDB to be ready...', `url: ${ksqlDbUrl}`);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${ksqlDbUrl}/info`);
      if (response.ok) {
        const data = (await response.json()) as {
          KsqlServerInfo?: { version?: string };
        };
        if (data.KsqlServerInfo?.version) {
          // KSQLDB가 완전히 준비되려면 추가 시간이 필요할 수 있음
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return;
        }
      }
    } catch {
      // 연결 실패는 정상 (아직 시작 중)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `KSQLDB at ${ksqlDbUrl} did not become ready within ${maxRetries} seconds`,
  );
}

async function setupKSQLQueries(ksqlDbUrl: string) {
  console.log('🔄 Setting up KSQL queries...');

  // KSQL REST API를 사용하여 쿼리 실행 (재시도 로직 포함)
  const executeKSQL = async (
    ksql: string,
    streamsProperties: Record<string, string> = {},
    retries = 3,
  ) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${ksqlDbUrl}/ksql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.ksql.v1+json',
          },
          body: JSON.stringify({
            ksql,
            streamsProperties,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // 이미 존재하는 경우는 무시 (에러 메시지에 "already exists" 포함)
          if (
            errorText.includes('already exists') ||
            errorText.includes('already registered')
          ) {
            console.log(
              `   ℹ️  ${ksql.split(' ')[0]} already exists, skipping...`,
            );
            return;
          }
          throw new Error(
            `KSQL query failed: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        const result = (await response.json()) as Array<{
          errorMessage?: string;
        }>;
        if (result[0]?.errorMessage) {
          // 이미 존재하는 경우는 무시
          const errorMsg = result[0].errorMessage;
          if (
            errorMsg.includes('already exists') ||
            errorMsg.includes('already registered')
          ) {
            console.log(
              `   ℹ️  ${ksql.split(' ')[0]} already exists, skipping...`,
            );
            return;
          }
          throw new Error(`KSQL query error: ${errorMsg}`);
        }
        return result;
      } catch (error) {
        if (attempt < retries) {
          const waitTime = attempt * 1000; // 1초, 2초, 3초 대기
          console.log(
            `   ⚠️  Attempt ${attempt} failed, retrying in ${waitTime}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
    throw new Error('All retry attempts failed');
  };

  // 기존 스트림/테이블 삭제 (earliest offset을 적용하기 위해)
  const dropIfExists = async (name: string, type: 'STREAM' | 'TABLE') => {
    try {
      await executeKSQL(`DROP ${type} IF EXISTS ${name} DELETE TOPIC;`);
    } catch {
      // 삭제 실패는 무시 (존재하지 않는 경우)
    }
  };

  try {
    // 전역 설정: earliest offset으로 설정
    // console.log('   ⚙️  Setting global auto.offset.reset to earliest...');
    // await executeKSQL(`SET 'auto.offset.reset'='earliest';`);
    // console.log('   ✅ Global offset reset configured');

    // 기존 객체들을 먼저 삭제 (earliest offset을 적용하기 위해)
    // 기존 consumer group offset이 설정되어 있으면 earliest가 적용되지 않음
    console.log('   🗑️  Cleaning up existing KSQL objects to reset offsets...');
    await dropIfExists('cafe_info_with_region_mv', 'TABLE');
    await dropIfExists('cafe_info_table', 'TABLE');
    await dropIfExists('region_category_table', 'TABLE');
    await dropIfExists('cafe_info_extracted', 'STREAM');
    await dropIfExists('region_category_stream', 'STREAM');
    await dropIfExists('cafe_info_stream', 'STREAM');
    console.log('   ✅ Cleanup completed - offsets will be reset to earliest');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 삭제 완료 대기

    // 1. CafeInfo 토픽을 스트림으로 생성
    // Debezium 메시지 형식: before, after, op 필드를 포함
    console.log('   📝 Creating stream for dbserver.public.CafeInfo...');
    const resultStreamCafeInfo = await executeKSQL(
      `CREATE STREAM IF NOT EXISTS stream_cafe_info (
        before STRUCT<
          id BIGINT,
          "createdAt" BIGINT,
          "isDisable" BOOLEAN,
          name VARCHAR,
          code VARCHAR,
          "regionCategoryId" BIGINT,
          address VARCHAR,
          directions VARCHAR,
          "businessNumber" VARCHAR,
          "ceoName" VARCHAR
        >,
        after STRUCT<
          id BIGINT,
          "createdAt" BIGINT,
          "isDisable" BOOLEAN,
          name VARCHAR,
          code VARCHAR,
          "regionCategoryId" BIGINT,
          address VARCHAR,
          directions VARCHAR,
          "businessNumber" VARCHAR,
          "ceoName" VARCHAR
        >,
        op VARCHAR,
        ts_ms BIGINT
      ) WITH (
        KAFKA_TOPIC='dbserver.public.CafeInfo',
        VALUE_FORMAT='JSON'
      );
    `,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );
    console.log('✅ CafeInfo stream created', resultStreamCafeInfo);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 쿼리 사이 대기

    // 실제 데이터를 추출하는 스트림 생성
    // c(create), u(update): after 필드에서 데이터 추출
    // d(delete): before 필드에서 데이터 추출
    // r(read/snapshot): after 필드에서 데이터 추출
    await executeKSQL(
      `
      CREATE STREAM IF NOT EXISTS stream_cafe_info_extracted 
      AS
      SELECT 
        COALESCE(after->id, before->id) AS id,
        COALESCE(after->"createdAt", before->"createdAt") AS "createdAt",
        COALESCE(after->"isDisable", before->"isDisable") AS "isDisable",
        COALESCE(after->name, before->name) AS name,
        COALESCE(after->code, before->code) AS code,
        COALESCE(after->"regionCategoryId", before->"regionCategoryId") AS "regionCategoryId",
        COALESCE(after->address, before->address) AS address,
        COALESCE(after->directions, before->directions) AS directions,
        COALESCE(after->"businessNumber", before->"businessNumber") AS "businessNumber",
        COALESCE(after->"ceoName", before->"ceoName") AS "ceoName",
        op,
        before,
        after,
        ts_ms
      FROM stream_cafe_info
      WHERE (after IS NOT NULL OR before IS NOT NULL)
      PARTITION BY COALESCE(after->id, before->id)
      EMIT CHANGES;
    `,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );

    // CafeInfo 테이블 생성 (최신 상태를 저장하는 KSQL TABLE)
    await executeKSQL(
      `
      CREATE TABLE IF NOT EXISTS tbl_cafe_info 
      WITH (KEY_FORMAT='JSON')
      AS
      SELECT 
        id,
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
      GROUP BY id
      EMIT CHANGES;
    `,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );

    // 2. RegionCategory 토픽을 테이블로 생성 (JOIN을 위해 테이블 사용)
    console.log('   📝 Creating table for dbserver.public.RegionCategory...');
    const resultStreamRegionCategory = await executeKSQL(
      `CREATE STREAM IF NOT EXISTS stream_region_category (
        before STRUCT<
          id BIGINT,
          "createdAt" BIGINT,
          name VARCHAR,
          "isDisable" BOOLEAN,
          "govermentType" VARCHAR
        >,
        after STRUCT<
          id BIGINT,
          "createdAt" BIGINT,
          name VARCHAR,
          "isDisable" BOOLEAN,
          "govermentType" VARCHAR
        >,
        op VARCHAR,
        ts_ms BIGINT
      ) WITH (
        KAFKA_TOPIC='dbserver.public.RegionCategory',
        VALUE_FORMAT='JSON'
      );
    `,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );
    console.log('✅ RegionCategory stream created', resultStreamRegionCategory);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 쿼리 사이 대기

    // RegionCategory 테이블 생성 (after 필드에서 데이터 추출)
    await executeKSQL(
      `
      CREATE TABLE IF NOT EXISTS tbl_region_category 
      WITH (KEY_FORMAT='JSON')
      AS
      SELECT 
        after->id AS id,
        LATEST_BY_OFFSET(after->"createdAt") AS "createdAt",
        LATEST_BY_OFFSET(after->name) AS name,
        LATEST_BY_OFFSET(after->"isDisable") AS "isDisable",
        LATEST_BY_OFFSET(after->"govermentType") AS "govermentType"
      FROM stream_region_category
      WHERE after IS NOT NULL
      GROUP BY after->id
      EMIT CHANGES;
    `,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );

    // 3. TABLE*TABLE CTAS로 반정규화된 CafeInfo+RegionCategory 뷰 생성
    // - 기준: cafe_info_table (최신 CafeInfo 상태)
    // - JOIN: region_category_table (최신 RegionCategory 상태)
    // 이 CTAS TABLE의 changelog 토픽은 CafeInfo/RegionCategory 어느 쪽이 바뀌어도 갱신 이벤트를 발행함
    console.log(
      '   📝 Creating denormalized TABLE: mv_cafe_info_with_region (TABLE*TABLE)...',
    );
    await executeKSQL(
      `
      CREATE TABLE IF NOT EXISTS mv_cafe_info_with_region AS
      SELECT 
        ci.id                   AS "id",
        ci."createdAt"          AS "createdAt",
        ci."isDisable"          AS "isDisable",
        ci.name                 AS "name",
        ci.code                 AS "code",
        ci."regionCategoryId"   AS "regionCategoryId",
        ci.address              AS "address",
        ci.directions           AS "directions",
        ci."businessNumber"     AS "businessNumber",
        ci."ceoName"            AS "ceoName",
        STRUCT(
          "id" := rc.id,
          "createdAt" := rc."createdAt",
          "name" := rc.name,
          "isDisable" := rc."isDisable",
          "govermentType" := rc."govermentType"
        ) AS "RegionCategory"
      FROM tbl_cafe_info ci
      INNER JOIN tbl_region_category rc
        ON ci."regionCategoryId" = rc.id
      EMIT CHANGES;
    `,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );

    console.log('✅ KSQL queries setup completed');
    console.log('   📊 Created table: mv_cafe_info_with_region');
    console.log('   📊 Output topic (changelog): CAFE_INFO_WITH_REGION_MV');
  } catch (error) {
    console.error('❌ Failed to setup KSQL queries:', error);
    throw error;
  }
}

async function stopPostgres() {
  console.log('🔄 Stopping Postgres...');
  await postgres?.stop();
  console.log('✅ Postgres stopped');
}

async function stopKafka() {
  console.log('🔄 Stopping Kafka...');
  await kafka?.stop({
    removeVolumes: true,
  });
  console.log('✅ Kafka stopped');
}

async function stopDebeziumConnect() {
  console.log('🔄 Stopping Debezium Connect...');
  await connect?.stop();
  console.log('✅ Debezium Connect stopped');
}

async function stopElasticsearch() {
  console.log('🔄 Stopping Elasticsearch...');
  await elastic?.stop({
    removeVolumes: true,
  });
  console.log('✅ Elasticsearch stopped');
}

async function stopKibana() {
  console.log('🔄 Stopping Kibana...');
  await kibana?.stop({
    removeVolumes: true,
  });
  console.log('✅ Kibana stopped');
}

async function stopKafkaUi() {
  console.log('🔄 Stopping Kafka UI...');
  await kafkaUi?.stop();
  console.log('✅ Kafka UI stopped');
}

async function stopKSQLDB() {
  console.log('🔄 Stopping KSQLDB...');
  await ksqlDb?.stop({
    removeVolumes: true,
  });
  console.log('✅ KSQLDB stopped');
}

let isStartCleanUp = false;
async function cleanUp(code: number = 0) {
  if (isStartCleanUp) {
    console.log('🧹 Clean up already started. Skipping... code: ', code);
    return;
  }
  isStartCleanUp = true;
  console.log('🧹 Cleaning up... code: ', code);
  await stopPostgres();
  await stopKafka();
  await stopDebeziumConnect();
  await stopKibana();
  await stopElasticsearch();
  await stopKafkaUi();
  await stopKSQLDB();
  await removeNetwork();
  stopNestJS();
  console.log('✅ Clean up completed');
  process.exit(code || 0);
}

function startNestJS({
  shouldStartAppWithWatch,
  regionCategoriesBaseUrl,
  elasticsearchUrl,
  kafkaUrl,
}: {
  shouldStartAppWithWatch: boolean;
  regionCategoriesBaseUrl: string;
  elasticsearchUrl?: string;
  kafkaUrl: string;
}) {
  // NestJS 앱을 spawn으로 시작 (환경변수는 이미 process.env에 설정됨)
  const isWindows = process.platform === 'win32';
  const nestCliPath = isWindows
    ? path.resolve(process.cwd(), './node_modules/.bin/nest.cmd')
    : path.resolve(process.cwd(), './node_modules/.bin/nest');
  nestProcess = spawn(
    nestCliPath,
    ['start', shouldStartAppWithWatch ? '--watch' : ''],
    {
      env: {
        ...process.env,
        REGION_CATEGORIES_BASE_URL: regionCategoriesBaseUrl,
        ELASTICSEARCH_HOSTS: elasticsearchUrl,
        ELASTICSEARCH_USERNAME: ELASTIC_USERNAME,
        ELASTICSEARCH_PASSWORD: ELASTIC_PASSWORD,
        // PLAINTEXT:// 프리픽스 제거 (예: PLAINTEXT://localhost:9092 -> localhost:9092)
        KAFKA_BROKERS: kafkaUrl.replace(/^PLAINTEXT:\/\//, ''),
      },
      shell: isWindows,
      stdio: 'inherit', // 부모 프로세스의 stdio를 상속
      cwd: path.resolve(process.cwd()),
    },
  );
  nestProcess.on('exit', (code) => {
    console.log('✅ NestJS app exited with code: ', code);
    void cleanUp(code || 0);
  });

  return nestProcess;
}

function stopNestJS() {
  console.log('🔄 Stopping NestJS...');
  nestProcess?.kill();
  console.log('✅ NestJS stopped');
  nestProcess = undefined;
}

async function removeNetwork() {
  console.log('🔄 Removing network...');
  await network?.stop();
  console.log('✅ Network removed');
  network = undefined;
}

async function bootstrap(args: string[]) {
  network = await new Network({
    nextUuid: () => 'mecipe-network-test',
  }).start();

  let commandParameters: string[] = [];
  try {
    commandParameters = getCommandParameters('--exclude', args).flat();
  } catch {
    console.error('모두 실행합니다. --exclude 옵션을 사용하지 않았습니다.');
  }
  const excludePostgres = commandParameters.includes('postgres');
  if (excludePostgres) console.log('🔄 Postgres를 실행하지 않습니다.');
  const excludeKafka = commandParameters.includes('kafka');
  if (excludeKafka) console.log('🔄 Kafka를 실행하지 않습니다.');
  const excludeDebeziumConnect = commandParameters.includes('debezium-connect');
  if (excludeDebeziumConnect)
    console.log('🔄 Debezium Connect를 실행하지 않습니다.');
  const excludeKafkaUi = commandParameters.includes('kafka-ui');
  if (excludeKafkaUi) console.log('🔄 Kafka UI를 실행하지 않습니다.');
  const excludeKibana = commandParameters.includes('kibana');
  if (excludeKibana) console.log('🔄 Kibana를 실행하지 않습니다.');
  const excludeElasticsearch = commandParameters.includes('elasticsearch');
  if (excludeElasticsearch)
    console.log('🔄 Elasticsearch를 실행하지 않습니다.');
  const excludeKSQLDB = commandParameters.includes('ksqldb');
  if (excludeKSQLDB) console.log('🔄 KSQLDB를 실행하지 않습니다.');
  if (!excludePostgres) {
    await startPostgres(network);
  }
  if (!excludeKafka) {
    await startKafka(network);
  }
  if (!excludeDebeziumConnect) {
    let _kafkaInternalBootstrapServer = kafkaInternalBootstrapServer;
    if (!_kafkaInternalBootstrapServer) {
      const kafkaParameter = getCommandParameters('--kafka', args)[0];
      _kafkaInternalBootstrapServer = kafkaParameter[0];
    }
    let postgresHost: string | undefined;
    let postgresPort: string | undefined;
    let postgresUsername: string | undefined;
    let postgresPassword: string | undefined;
    let postgresDatabase: string | undefined;
    if (postgres) {
      postgresHost = 'host.docker.internal';
      postgresPort = postgres?.getMappedPort(5432).toString();
      postgresUsername = postgres?.getUsername();
      postgresPassword = postgres?.getPassword();
      postgresDatabase = postgres?.getDatabase();
    } else {
      const postgresParameter = getCommandParameters('--postgres', args)[0];
      postgresHost = postgresParameter[0];
      postgresPort = postgresParameter[1];
      postgresUsername = postgresParameter[2];
      postgresPassword = postgresParameter[3];
      postgresDatabase = postgresParameter[4];
    }
    await startDebeziumConnect(network, {
      bootstrapServer: _kafkaInternalBootstrapServer,
      postgresHost,
      postgresPort: postgresPort.toString(),
      postgresUsername: postgresUsername.toString(),
      postgresPassword: postgresPassword.toString(),
      postgresDatabase: postgresDatabase.toString(),
    });
  }
  if (!excludeElasticsearch) {
    await startElasticsearch(network);
  }
  if (!excludeKafkaUi) {
    let bootstrapServer = kafkaInternalBootstrapServer;
    if (!bootstrapServer) {
      const kafkaParameter = getCommandParameters('--kafka', args)[0];
      if (!kafkaParameter?.[0]) {
        throw new Error(
          '❌ Kafka bootstrap server is required for Kafka UI (--kafka-url or start Kafka container)',
        );
      }
      bootstrapServer = kafkaParameter[0].replace(/^PLAINTEXT:\/\//, '');
    }
    if (!bootstrapServer) {
      throw new Error('❌ Kafka bootstrap server is required for Kafka UI');
    }
    await startKafkaUi(network, { kafkaBootstrapServer: bootstrapServer });
  }
  if (!excludeKibana) {
    const _elasticsearchUrl = internalElasticsearchUrl;
    if (!_elasticsearchUrl) {
      throw new Error('❌ Elasticsearch URL is required for Kibana');
    }
    await startKibana(network, _elasticsearchUrl);
  }
  if (!excludeKSQLDB) {
    let bootstrapServer = kafkaInternalBootstrapServer;
    if (!bootstrapServer) {
      const kafkaParameter = getCommandParameters('--kafka', args)[0];
      if (!kafkaParameter?.[0]) {
        throw new Error(
          '❌ Kafka bootstrap server is required for KSQLDB (--kafka-url or start Kafka container)',
        );
      }
      bootstrapServer = kafkaParameter[0].replace(/^PLAINTEXT:\/\//, '');
    }
    if (!bootstrapServer) {
      throw new Error('❌ Kafka bootstrap server is required for KSQLDB');
    }
    await startKSQLDB(network, bootstrapServer);
  }
  const isStartApp = args.includes('--start-app');
  const isStartAppWithWatch = args.includes('--watch');
  const regionCategoriesBaseUrl = getCommandParameters(
    '--region-url',
    args,
  )[0][0];
  if (!regionCategoriesBaseUrl) {
    throw new Error('❌ Region categories base URL is required');
  }
  let _elasticsearchUrl: string | undefined = elasticUrl;
  if (!_elasticsearchUrl) {
    const getElasticsearchUrl = getCommandParameters('--es-url', args)[0];
    _elasticsearchUrl = getElasticsearchUrl[0];
  }
  let _kafkaUrl: string | undefined = kafkaUrl;
  if (!_kafkaUrl) {
    const getKafkaUrl = getCommandParameters('--kafka-url', args)[0];
    _kafkaUrl = getKafkaUrl[0];
  }

  if (isStartApp) {
    startNestJS({
      shouldStartAppWithWatch: isStartAppWithWatch,
      regionCategoriesBaseUrl,
      elasticsearchUrl: _elasticsearchUrl,
      kafkaUrl: _kafkaUrl,
    });
  }
}

if (require.main === module) {
  bootstrap(process.argv.slice(2)).catch(async (error) => {
    console.error('❌ Total infrastructure setup failed:', error);
    await cleanUp(1);
  });
  process.on('SIGINT', () => {
    void cleanUp(0);
  });
  process.on('SIGTERM', () => {
    void cleanUp(0);
  });
}
