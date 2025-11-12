import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ElasticsearchService } from './elasticsearch.service';
import { CAFEINFO_INDEX_NAME, INDEX_TYPE_MAP } from './libs';

const indicesMock = {
  exists: jest.fn(),
  create: jest.fn(),
};

const clientMock = {
  indices: indicesMock,
  index: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(() => clientMock),
  };
});

describe('ElasticsearchService', () => {
  const host = 'http://localhost:9200';
  let configService: ConfigService;

  const createService = () => new ElasticsearchService(configService);

  beforeEach(() => {
    (Client as unknown as jest.Mock).mockClear();
    indicesMock.exists.mockReset();
    indicesMock.create.mockReset();
    clientMock.index.mockReset();
    clientMock.delete.mockReset();
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ELASTICSEARCH_HOSTS') {
          return host;
        }
        return undefined;
      }),
    } as unknown as ConfigService;
  });

  it('creates an Elasticsearch client with config host', () => {
    createService();

    expect(Client).toHaveBeenCalledWith({
      node: host,
    });
  });

  it('creates index when it does not exist on module init', async () => {
    const service = createService();
    indicesMock.exists.mockResolvedValue(false);
    indicesMock.create.mockResolvedValue({});

    await service.createIndexIfNotExist(CAFEINFO_INDEX_NAME);

    expect(indicesMock.exists).toHaveBeenCalledWith({
      index: CAFEINFO_INDEX_NAME,
    });
    expect(indicesMock.create).toHaveBeenCalledWith({
      index: CAFEINFO_INDEX_NAME,
      mappings: INDEX_TYPE_MAP[CAFEINFO_INDEX_NAME],
    });
  });

  it('does not create index when it already exists', async () => {
    const service = createService();
    indicesMock.exists.mockResolvedValue(true);

    await service.createIndexIfNotExist(CAFEINFO_INDEX_NAME);

    expect(indicesMock.create).not.toHaveBeenCalled();
  });

  it('indexes documents with provided payload and optional id', async () => {
    const service = createService();
    const doc = { name: 'cafe' } as unknown as Parameters<
      typeof service.indexDocument
    >[1];

    await service.indexDocument(CAFEINFO_INDEX_NAME, doc, '123');

    expect(clientMock.index).toHaveBeenCalledWith({
      index: CAFEINFO_INDEX_NAME,
      id: '123',
      document: doc,
    });
  });

  it('deletes documents by id', async () => {
    const service = createService();

    await service.deleteDocument(CAFEINFO_INDEX_NAME, '123');

    expect(clientMock.delete).toHaveBeenCalledWith({
      index: CAFEINFO_INDEX_NAME,
      id: '123',
    });
  });
});
