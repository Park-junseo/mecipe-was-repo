// npm run start:test -- --start-app --exclude:postgres --region-url:"http://localhost:4000/regioncategories" --postgres:host.docker.internal:32805:testuser:testpassword:testdb
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
      'table.include.list': 'public.CafeInfo',
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
    .withExposedPorts(9200)
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
