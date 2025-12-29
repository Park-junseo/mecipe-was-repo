// pnpm run start:test -- --start-app --exclude:postgres --region-url:http://localhost:4000/regioncategories --postgres:host.docker.internal:32769:testuser:testpassword:testdb
// 리펙토링
import {
  StartedPostgreSqlContainer,
  PostgreSqlContainer,
} from '@testcontainers/postgresql';
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

// ============================================================================
// Types
// ============================================================================

type DebeziumConfig = {
  bootstrapServer: string;
  postgresHost: string;
  postgresPort: string;
  postgresUsername: string;
  postgresPassword: string;
  postgresDatabase: string;
};

type NestJSConfig = {
  shouldStartAppWithWatch: boolean;
  elasticsearchUrl?: string;
  kafkaUrl: string;
};

// ============================================================================
// Constants
// ============================================================================

const NETWORK_NAME = 'mecipe-network-test';

// Host names
const KAFKA_HOST_NAME = 'mecipe-test-kafka';
const ELASTICSEARCH_HOST_NAME = 'mecipe-test-elasticsearch';
const POSTGRES_HOST_NAME = 'mecipe-test-postgres';
const DEBEZIUM_HOST_NAME = 'mecipe-test-debezium';
const KAFKA_UI_HOST_NAME = 'mecipe-test-kafka-ui';
const KIBANA_HOST_NAME = 'mecipe-test-kibana';
const KSQLDB_HOST_NAME = 'mecipe-test-ksqldb';
const EXTERNAL_HOST_NAME = 'host.docker.internal';

// Elasticsearch credentials
const ELASTIC_PASSWORD = 'elasticpassword';
const ELASTIC_NESTJS_USERNAME = 'elastic_nestjs';
const ELASTIC_NESTJS_PASSWORD = 'elasticpassword_nestjs';
const ELASTIC_KIBANA_USERNAME = 'kibana_system';
const ELASTIC_KIBANA_PASSWORD = 'elasticpassword_kibana';

// Kafka configuration
const FIXED_KAFKA_PORT = 9092;
const KAFKA_INTERNAL_PORT = 29092;

// Container images
const IMAGES = {
  POSTGRES: 'debezium/postgres:16-alpine',
  KAFKA: 'confluentinc/cp-kafka:7.5.0',
  DEBEZIUM: 'debezium/connect:2.6',
  ELASTICSEARCH: 'docker.elastic.co/elasticsearch/elasticsearch:8.14.0',
  KIBANA: 'docker.elastic.co/kibana/kibana:8.14.0',
  KAFKA_UI: 'provectuslabs/kafka-ui:latest',
  KSQLDB: 'confluentinc/ksqldb-server:latest',
} as const;

// ============================================================================
// State
// ============================================================================

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
let isStartCleanUp = false;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Basic authentication header 생성
 */
function createBasicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

/**
 * Elasticsearch API 호출 헬퍼
 */
async function elasticsearchRequest(
  url: string,
  method: string = 'GET',
  body?: unknown,
  username: string = 'elastic',
  password: string = ELASTIC_PASSWORD,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: createBasicAuth(username, password),
  };

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * 지정된 시간만큼 대기
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Debezium Configuration
// ============================================================================

/**
 * 외부 Postgres를 위한 Debezium 커넥터 설정 생성
 */
function createDebeziumConnectorConfig(
  dbHost: string = EXTERNAL_HOST_NAME,
  dbPort: string | number,
  dbName: string,
  dbUser: string,
  dbPass: string,
): string {
  return JSON.stringify({
    name: 'cafe-infos-debezium-connector',
    config: {
      'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
      'plugin.name': 'pgoutput',
      'tasks.max': '1',
      'database.hostname': dbHost,
      'database.port': dbPort,
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
}

// ============================================================================
// Postgres
// ============================================================================

async function startPostgres(network: StartedNetwork): Promise<void> {
  console.log('🔄 Starting Postgres...');
  postgres = await new PostgreSqlContainer(IMAGES.POSTGRES)
    .withNetwork(network)
    .withNetworkAliases(POSTGRES_HOST_NAME)
    .withEnvironment({
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'mydb',
    })
    .start();
  console.log(
    '✅ Postgres started',
    `host: ${postgres?.getHost()}`,
    `port: ${postgres?.getMappedPort(5432).toString()}`,
  );
}

async function stopPostgres(): Promise<void> {
  console.log('🔄 Stopping Postgres...');
  await postgres?.stop();
  console.log('✅ Postgres stopped');
}

// ============================================================================
// Kafka
// ============================================================================

async function waitForKafkaReady(
  host: string,
  port: number,
  maxRetries = 30,
): Promise<void> {
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
      await sleep(2000);
      return;
    }

    await sleep(1000);
  }

  throw new Error(
    `Kafka at ${host}:${port} did not become ready within ${maxRetries} seconds`,
  );
}

async function startKafka(network: StartedNetwork): Promise<void> {
  console.log('🔄 Starting Kafka...');
  kafkaInternalBootstrapServer = `${KAFKA_HOST_NAME}:${KAFKA_INTERNAL_PORT}`;

  const kafkaNodeId = 1;
  const host = 'localhost';

  const kafkaContainer = new GenericContainer(IMAGES.KAFKA)
    .withNetwork(network)
    .withNetworkAliases(KAFKA_HOST_NAME)
    .withExposedPorts({
      container: 9092,
      host: FIXED_KAFKA_PORT,
    });

  kafka = await kafkaContainer
    .withEnvironment({
      KAFKA_NODE_ID: kafkaNodeId.toString(),
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP:
        'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT',
      KAFKA_ADVERTISED_LISTENERS: `PLAINTEXT://${KAFKA_HOST_NAME}:${KAFKA_INTERNAL_PORT},PLAINTEXT_HOST://${host}:${FIXED_KAFKA_PORT}`,
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: '0',
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: '1',
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: '1',
      KAFKA_JMX_PORT: '9101',
      KAFKA_JMX_HOSTNAME: 'localhost',
      KAFKA_PROCESS_ROLES: 'broker,controller',
      KAFKA_CONTROLLER_QUORUM_VOTERS: `${kafkaNodeId}@${KAFKA_HOST_NAME}:29093`,
      KAFKA_LISTENERS: `PLAINTEXT://${KAFKA_HOST_NAME}:${KAFKA_INTERNAL_PORT},CONTROLLER://${KAFKA_HOST_NAME}:29093,PLAINTEXT_HOST://0.0.0.0:9092`,
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

  console.log('⏳ Waiting for Kafka to be fully ready...');
  await waitForKafkaReady(kafkaHost, kafkaPort, 60);
  console.log('✅ Kafka is ready to accept connections');
}

async function stopKafka(): Promise<void> {
  console.log('🔄 Stopping Kafka...');
  await kafka?.stop({ removeVolumes: true });
  console.log('✅ Kafka stopped');
}

// ============================================================================
// Debezium Connect
// ============================================================================

async function startDebeziumConnect(
  network: StartedNetwork,
  config: DebeziumConfig,
): Promise<void> {
  const {
    bootstrapServer,
    postgresHost,
    postgresPort,
    postgresUsername,
    postgresPassword,
    postgresDatabase,
  } = config;

  console.log('🔄 Starting Debezium Connect...');
  connect = await new GenericContainer(IMAGES.DEBEZIUM)
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
    body: createDebeziumConnectorConfig(
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

async function stopDebeziumConnect(): Promise<void> {
  console.log('🔄 Stopping Debezium Connect...');
  await connect?.stop();
  console.log('✅ Debezium Connect stopped');
}

// ============================================================================
// Elasticsearch
// ============================================================================

async function waitForElasticsearchReady(
  elasticUrl: string,
  username: string,
  password: string,
  maxRetries = 30,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await elasticsearchRequest(
        `${elasticUrl}/_cluster/health`,
        'GET',
        undefined,
        username,
        password,
      );

      if (response.ok) {
        const data = (await response.json()) as { status: string };
        if (data.status === 'yellow' || data.status === 'green') {
          return true;
        }
      }
    } catch {
      // ignore
    }
    await sleep(2000);
  }
  return false;
}

async function resetElasticPassword(
  elasticUrl: string,
  targetPassword: string,
): Promise<void> {
  const possiblePasswords = [targetPassword, 'changeme', ''];

  let currentPassword: string | null = null;

  for (const password of possiblePasswords) {
    try {
      const response = await elasticsearchRequest(
        `${elasticUrl}/_cluster/health`,
        'GET',
        undefined,
        'elastic',
        password,
      );

      if (response.ok) {
        currentPassword = password;
        console.log(
          `✅ Found working password for elastic user (${password === '' ? 'empty' : 'set'})`,
        );
        break;
      }
    } catch {
      // ignore
    }
  }

  if (currentPassword === null) {
    throw new Error(
      'Failed to authenticate with elastic user. Cannot reset password.',
    );
  }

  if (currentPassword === targetPassword) {
    console.log('✅ Elastic password is already set to target value');
    return;
  }

  console.log('🔄 Resetting elastic user password...');
  const setPasswordResponse = await elasticsearchRequest(
    `${elasticUrl}/_security/user/elastic/_password`,
    'POST',
    { password: targetPassword },
    'elastic',
    currentPassword,
  );

  if (!setPasswordResponse.ok) {
    const errorText = await setPasswordResponse.text();
    throw new Error(
      `Failed to reset elastic password: ${setPasswordResponse.status} ${errorText}`,
    );
  }

  console.log('✅ Elastic password reset successfully');
}

async function startElasticsearch(network: StartedNetwork): Promise<void> {
  console.log('🔄 Starting Elasticsearch...');
  elastic = await new ElasticsearchContainer(IMAGES.ELASTICSEARCH)
    .withNetwork(network)
    .withNetworkAliases(ELASTICSEARCH_HOST_NAME)
    .withEnvironment({
      'discovery.type': 'single-node',
      'xpack.security.enabled': 'true',
      'xpack.security.http.ssl.enabled': 'false',
      ELASTIC_PASSWORD: ELASTIC_PASSWORD,
    })
    .withExposedPorts({
      container: 9200,
      host: 9200,
    })
    .start();

  elasticUrl = `http://${elastic?.getHost()}:${elastic?.getMappedPort(9200).toString()}`;
  internalElasticsearchUrl = `http://${ELASTICSEARCH_HOST_NAME}:9200`;
  console.log('✅ Elasticsearch started', `url: ${elasticUrl}`);

  console.log('⏳ Waiting for Elasticsearch to be ready...');
  const isReady = await waitForElasticsearchReady(
    elasticUrl,
    'elastic',
    ELASTIC_PASSWORD,
  );

  if (!isReady) {
    console.log(
      '⚠️ Elasticsearch not ready with ELASTIC_PASSWORD, trying to reset...',
    );
    await resetElasticPassword(elasticUrl, ELASTIC_PASSWORD);
    const retryReady = await waitForElasticsearchReady(
      elasticUrl,
      'elastic',
      ELASTIC_PASSWORD,
      10,
    );
    if (!retryReady) {
      throw new Error(
        'Elasticsearch failed to become ready after password reset',
      );
    }
  } else {
    await resetElasticPassword(elasticUrl, ELASTIC_PASSWORD);
  }
}

async function stopElasticsearch(): Promise<void> {
  console.log('🔄 Stopping Elasticsearch...');
  await elastic?.stop({ removeVolumes: true });
  console.log('✅ Elasticsearch stopped');
}

// ============================================================================
// Kibana
// ============================================================================

async function startKibana(
  network: StartedNetwork,
  elasticUrl: string,
  internalElasticsearchUrl: string,
): Promise<void> {
  console.log('🔄 Starting Kibana...');
  console.log(`   Connecting to Elasticsearch: ${internalElasticsearchUrl}`);

  const setPasswordResponse = await elasticsearchRequest(
    `${elasticUrl}/_security/user/${ELASTIC_KIBANA_USERNAME}/_password`,
    'POST',
    { password: ELASTIC_KIBANA_PASSWORD },
  );

  if (!setPasswordResponse.ok) {
    throw new Error(
      `Failed to set Kibana password: ${setPasswordResponse.statusText}`,
    );
  }

  console.log('✅ Kibana password set', await setPasswordResponse.json());

  const kibanaElasticsearchHosts = JSON.stringify([internalElasticsearchUrl]);
  kibana = await new GenericContainer(IMAGES.KIBANA)
    .withNetwork(network)
    .withNetworkAliases(KIBANA_HOST_NAME)
    .withEnvironment({
      ELASTICSEARCH_HOSTS: kibanaElasticsearchHosts,
      ELASTICSEARCH_USERNAME: ELASTIC_KIBANA_USERNAME,
      ELASTICSEARCH_PASSWORD: ELASTIC_KIBANA_PASSWORD,
    })
    .withExposedPorts(5601)
    .withWaitStrategy(Wait.forListeningPorts().withStartupTimeout(180000))
    .start();

  kibanaUrl = `http://${kibana?.getHost()}:${kibana?.getMappedPort(5601).toString()}`;
  console.log('✅ Kibana started', `url: ${kibanaUrl}`);
}

async function stopKibana(): Promise<void> {
  console.log('🔄 Stopping Kibana...');
  await kibana?.stop({ removeVolumes: true });
  console.log('✅ Kibana stopped');
}

// ============================================================================
// Kafka UI
// ============================================================================

async function startKafkaUi(
  network: StartedNetwork,
  options: { kafkaBootstrapServer: string },
): Promise<void> {
  const { kafkaBootstrapServer } = options;
  console.log('🔄 Starting Kafka UI...');
  kafkaUi = await new GenericContainer(IMAGES.KAFKA_UI)
    .withNetwork(network)
    .withHostname(KAFKA_UI_HOST_NAME)
    .withEnvironment({
      KAFKA_CLUSTERS_0_NAME: 'local',
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafkaBootstrapServer,
      SERVER_PORT: '8080',
    })
    .withExposedPorts(8080)
    .start();

  kafkaUiUrl = `http://${kafkaUi?.getHost()}:${kafkaUi
    ?.getMappedPort(8080)
    .toString()}`;
  console.log('✅ Kafka UI started', `url: ${kafkaUiUrl}`);
}

async function stopKafkaUi(): Promise<void> {
  console.log('🔄 Stopping Kafka UI...');
  await kafkaUi?.stop();
  console.log('✅ Kafka UI stopped');
}

// ============================================================================
// KSQLDB
// ============================================================================

async function waitForKSQLDBReady(
  ksqlDbUrl: string,
  maxRetries = 60,
): Promise<void> {
  console.log('🔄 Waiting for KSQLDB to be ready...', `url: ${ksqlDbUrl}`);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${ksqlDbUrl}/info`);
      if (response.ok) {
        const data = (await response.json()) as {
          KsqlServerInfo?: { version?: string };
        };
        if (data.KsqlServerInfo?.version) {
          await sleep(3000);
          return;
        }
      }
    } catch {
      // ignore
    }
    await sleep(1000);
  }
  throw new Error(
    `KSQLDB at ${ksqlDbUrl} did not become ready within ${maxRetries} seconds`,
  );
}

async function executeKSQL(
  ksqlDbUrl: string,
  ksql: string,
  streamsProperties: Record<string, string> = {},
  retries = 3,
): Promise<unknown> {
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
        const waitTime = attempt * 1000;
        console.log(
          `   ⚠️  Attempt ${attempt} failed, retrying in ${waitTime}ms...`,
        );
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('All retry attempts failed');
}

async function dropKSQLObjectIfExists(
  ksqlDbUrl: string,
  name: string,
  type: 'STREAM' | 'TABLE',
): Promise<void> {
  try {
    await executeKSQL(
      ksqlDbUrl,
      `DROP ${type} IF EXISTS ${name} DELETE TOPIC;`,
    );
  } catch {
    // ignore
  }
}

async function setupKSQLQueries(ksqlDbUrl: string): Promise<void> {
  console.log('🔄 Setting up KSQL queries...');

  try {
    console.log('   🗑️  Cleaning up existing KSQL objects to reset offsets...');
    await dropKSQLObjectIfExists(
      ksqlDbUrl,
      'cafe_info_with_region_mv',
      'TABLE',
    );
    await dropKSQLObjectIfExists(ksqlDbUrl, 'cafe_info_table', 'TABLE');
    await dropKSQLObjectIfExists(ksqlDbUrl, 'region_category_table', 'TABLE');
    await dropKSQLObjectIfExists(ksqlDbUrl, 'cafe_info_extracted', 'STREAM');
    await dropKSQLObjectIfExists(ksqlDbUrl, 'region_category_stream', 'STREAM');
    await dropKSQLObjectIfExists(ksqlDbUrl, 'cafe_info_stream', 'STREAM');
    console.log('   ✅ Cleanup completed - offsets will be reset to earliest');
    await sleep(2000);

    // Create CafeInfo stream
    console.log('   📝 Creating stream for dbserver.public.CafeInfo...');
    const resultStreamCafeInfo = await executeKSQL(
      ksqlDbUrl,
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
      );`,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );
    console.log('✅ CafeInfo stream created', resultStreamCafeInfo);
    await sleep(1000);

    // Extract data stream
    await executeKSQL(
      ksqlDbUrl,
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

    // Create CafeInfo table
    await executeKSQL(
      ksqlDbUrl,
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

    // Create RegionCategory stream
    console.log('   📝 Creating table for dbserver.public.RegionCategory...');
    const resultStreamRegionCategory = await executeKSQL(
      ksqlDbUrl,
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
      );`,
      { 'ksql.streams.auto.offset.reset': 'earliest' },
    );
    console.log('✅ RegionCategory stream created', resultStreamRegionCategory);
    await sleep(1000);

    // Create RegionCategory table
    await executeKSQL(
      ksqlDbUrl,
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

    // Create denormalized view
    console.log(
      '   📝 Creating denormalized TABLE: mv_cafe_info_with_region (TABLE*TABLE)...',
    );
    await executeKSQL(
      ksqlDbUrl,
      `
      CREATE TABLE IF NOT EXISTS mv_cafe_info_with_region 
      WITH (KAFKA_TOPIC='mv_cafe_info_with_region')
      AS
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
    console.log('   📊 Output topic (changelog): mv_cafe_info_with_region');
  } catch (error) {
    console.error('❌ Failed to setup KSQL queries:', error);
    throw error;
  }
}

async function startKSQLDB(
  network: StartedNetwork,
  bootstrapKafkaServer: string,
): Promise<void> {
  console.log('🔄 Starting KSQLDB...');
  ksqlDb = await new GenericContainer(IMAGES.KSQLDB)
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
      Wait.forHttp('/info', 8088).forStatusCode(200).withStartupTimeout(180000),
    )
    .start();

  const ksqlDbUrl = `http://${ksqlDb?.getHost()}:${ksqlDb
    ?.getMappedPort(8088)
    .toString()}`;
  console.log('✅ KSQLDB started', `url: ${ksqlDbUrl}`);

  console.log('⏳ Waiting for KSQLDB to be fully ready...');
  await waitForKSQLDBReady(ksqlDbUrl, 60);
  console.log('✅ KSQLDB is ready to accept queries');

  await setupKSQLQueries(ksqlDbUrl);
}

async function stopKSQLDB(): Promise<void> {
  console.log('🔄 Stopping KSQLDB...');
  await ksqlDb?.stop({ removeVolumes: true });
  console.log('✅ KSQLDB stopped');
}

// ============================================================================
// NestJS Application
// ============================================================================

async function createOrUpdateElasticsearchUser(
  username: string,
  password: string,
  roles: string[] = ['superuser'],
): Promise<void> {
  if (!elasticUrl) {
    throw new Error('Elasticsearch URL is not available');
  }

  const getUserResponse = await elasticsearchRequest(
    `${elasticUrl}/_security/user/${username}`,
  );

  if (getUserResponse.ok) {
    const setPasswordResponse = await elasticsearchRequest(
      `${elasticUrl}/_security/user/${username}/_password`,
      'POST',
      { password },
    );

    if (!setPasswordResponse.ok) {
      const errorText = await setPasswordResponse.text();
      throw new Error(
        `Failed to set password: ${setPasswordResponse.status} ${errorText}`,
      );
    }
    console.log(`✅ ${username} password updated`);
  } else {
    const createUserResponse = await elasticsearchRequest(
      `${elasticUrl}/_security/user/${username}`,
      'POST',
      { password, roles },
    );

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      throw new Error(
        `Failed to create user: ${createUserResponse.status} ${errorText}`,
      );
    }
    console.log(`✅ ${username} user created`);
  }
}

async function startNestJS(config: NestJSConfig): Promise<ChildProcess> {
  const { shouldStartAppWithWatch, elasticsearchUrl, kafkaUrl } = config;
  const isWindows = process.platform === 'win32';
  const nxCliPath = isWindows
    ? path.resolve(__dirname, '../../../node_modules/.bin/nx.cmd')
    : path.resolve(__dirname, '../../../node_modules/.bin/nx');

  console.log('🔄 Creating/updating NestJS user...');
  await createOrUpdateElasticsearchUser(
    ELASTIC_NESTJS_USERNAME,
    ELASTIC_NESTJS_PASSWORD,
  );

  nestProcess = spawn(
    nxCliPath,
    ['serve', 'place-indexer-service', shouldStartAppWithWatch ? '--configuration=development' : ''],
    {
      env: {
        ...process.env,
        ELASTICSEARCH_HOSTS: elasticsearchUrl,
        ELASTICSEARCH_USERNAME: ELASTIC_NESTJS_USERNAME,
        ELASTICSEARCH_PASSWORD: ELASTIC_NESTJS_PASSWORD,
        KAFKA_BROKERS: kafkaUrl.replace(/^PLAINTEXT:\/\//, ''),
      },
      shell: isWindows,
      stdio: 'inherit',
      cwd: path.resolve(process.cwd()),
    },
  );

  nestProcess.on('exit', (code) => {
    console.log('✅ NestJS app exited with code: ', code);
    void cleanUp(code || 0);
  });

  return nestProcess;
}

function stopNestJS(): void {
  console.log('🔄 Stopping NestJS...');
  nestProcess?.kill();
  console.log('✅ NestJS stopped');
  nestProcess = undefined;
}

// ============================================================================
// Network Management
// ============================================================================

async function createNetwork(): Promise<StartedNetwork> {
  try {
    return await new Network({
      nextUuid: () => NETWORK_NAME,
    }).start();
  } catch (error: unknown) {
    const isNetworkExistsError =
      (error as { statusCode?: number })?.statusCode === 409 ||
      (error as { message?: string })?.message?.includes('already exists');

    if (isNetworkExistsError) {
      console.log(
        `⚠️  Network "${NETWORK_NAME}" already exists. Removing and recreating...`,
      );
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        await execAsync(`docker network rm ${NETWORK_NAME}`);
        console.log(`✅ Existing network "${NETWORK_NAME}" removed`);
        await sleep(1000);
      } catch (removeError) {
        console.log(
          `   ℹ️  Could not remove network (may be in use or already removed): ${removeError}`,
        );
      }

      return await new Network({
        nextUuid: () => NETWORK_NAME,
      }).start();
    }

    throw error;
  }
}

async function removeNetwork(): Promise<void> {
  console.log('🔄 Removing network...');
  await network?.stop();
  console.log('✅ Network removed');
  network = undefined;
}

// ============================================================================
// Cleanup
// ============================================================================

async function cleanUp(code: number = 0): Promise<void> {
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

// ============================================================================
// Bootstrap
// ============================================================================

function parseExcludeOptions(args: string[]): Set<string> {
  try {
    const commandParameters = getCommandParameters('--exclude', args).flat();
    return new Set(commandParameters);
  } catch {
    return new Set();
  }
}

function parsePostgresConfig(args: string[]): {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
} | null {
  if (postgres) {
    return {
      host: EXTERNAL_HOST_NAME,
      port: postgres.getMappedPort(5432).toString(),
      username: postgres.getUsername(),
      password: postgres.getPassword(),
      database: postgres.getDatabase(),
    };
  }

  const postgresParameter = getCommandParameters('--postgres', args)[0];
  if (!postgresParameter || postgresParameter.length < 5) {
    return null;
  }

  return {
    host: postgresParameter[0],
    port: postgresParameter[1],
    username: postgresParameter[2],
    password: postgresParameter[3],
    database: postgresParameter[4],
  };
}

async function bootstrap(args: string[]): Promise<void> {
  network = await createNetwork();

  const excludeOptions = parseExcludeOptions(args);
  const excludePostgres = excludeOptions.has('postgres');
  const excludeKafka = excludeOptions.has('kafka');
  const excludeDebeziumConnect = excludeOptions.has('debezium-connect');
  const excludeKafkaUi = excludeOptions.has('kafka-ui');
  const excludeKibana = excludeOptions.has('kibana');
  const excludeElasticsearch = excludeOptions.has('elasticsearch');
  const excludeKSQLDB = excludeOptions.has('ksqldb');

  if (excludePostgres) console.log('🔄 Postgres를 실행하지 않습니다.');
  if (excludeKafka) console.log('🔄 Kafka를 실행하지 않습니다.');
  if (excludeDebeziumConnect)
    console.log('🔄 Debezium Connect를 실행하지 않습니다.');
  if (excludeKafkaUi) console.log('🔄 Kafka UI를 실행하지 않습니다.');
  if (excludeKibana) console.log('🔄 Kibana를 실행하지 않습니다.');
  if (excludeElasticsearch)
    console.log('🔄 Elasticsearch를 실행하지 않습니다.');
  if (excludeKSQLDB) console.log('🔄 KSQLDB를 실행하지 않습니다.');

  // Start services
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

    const postgresConfig = parsePostgresConfig(args);
    if (!postgresConfig) {
      throw new Error(
        'Postgres configuration is required for Debezium Connect',
      );
    }

    await startDebeziumConnect(network, {
      bootstrapServer: _kafkaInternalBootstrapServer,
      postgresHost: postgresConfig.host,
      postgresPort: postgresConfig.port,
      postgresUsername: postgresConfig.username,
      postgresPassword: postgresConfig.password,
      postgresDatabase: postgresConfig.database,
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
    const _elasticsearchUrl = elasticUrl;
    const _internalElasticsearchUrl = internalElasticsearchUrl;
    if (!_elasticsearchUrl || !_internalElasticsearchUrl) {
      throw new Error('❌ Elasticsearch URL is required for Kibana');
    }
    console.log('⏳ Waiting for Elasticsearch to be fully ready...');
    await sleep(5000);
    await startKibana(network, _elasticsearchUrl, _internalElasticsearchUrl);
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

  // Start NestJS app
  const isStartApp = args.includes('--start-app');
  const isStartAppWithWatch = args.includes('--watch');
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
    await startNestJS({
      shouldStartAppWithWatch: isStartAppWithWatch,
      elasticsearchUrl: _elasticsearchUrl,
      kafkaUrl: _kafkaUrl,
    });
  }
}

// ============================================================================
// Main
// ============================================================================

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
