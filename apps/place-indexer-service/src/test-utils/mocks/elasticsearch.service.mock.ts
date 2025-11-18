import { ElasticsearchService as ESService } from '@nestjs/elasticsearch';
import { ElasticsearchService } from 'src/elasticsearch/elasticsearch.service';

export type MockNestElasticsearchService = Awaited<
  ReturnType<typeof createMockNestElasticsearchService>
>['service'];

/**
 * @nestjs/elasticsearch의 ElasticsearchService mock
 */
export const createMockNestElasticsearchService = () => {
  const mockIndices = {
    exists: jest.fn(),
    create: jest.fn(),
  };

  const mockIndex = jest.fn();
  const mockDelete = jest.fn();

  const mockNestElasticsearchService = {
    indices: mockIndices,
    index: mockIndex,
    delete: mockDelete,
  } as unknown as ESService;

  return {
    service: mockNestElasticsearchService,
    mockIndices,
    mockIndex,
    mockDelete,
    reset: () => {
      mockIndices.exists.mockReset();
      mockIndices.create.mockReset();
      mockIndex.mockReset();
      mockDelete.mockReset();
    },
  };
};

/**
 * 우리가 만든 ElasticsearchService의 mock
 */
export const createMockElasticsearchService = () => {
  const nestElasticsearchMock = createMockNestElasticsearchService();

  const mockCreateIndexIfNotExist = jest.fn();
  const mockIndexDocument = jest.fn();
  const mockDeleteDocument = jest.fn();

  const mockElasticsearchService = {
    createIndexIfNotExist: mockCreateIndexIfNotExist,
    indexDocument: mockIndexDocument,
    deleteDocument: mockDeleteDocument,
  } as unknown as ElasticsearchService;

  return {
    service: mockElasticsearchService,
    nestElasticsearchMock,
    mockCreateIndexIfNotExist,
    mockIndexDocument,
    mockDeleteDocument,
    reset: () => {
      nestElasticsearchMock.reset();
      mockCreateIndexIfNotExist.mockReset();
      mockIndexDocument.mockReset();
      mockDeleteDocument.mockReset();
    },
  };
};

/**
 * ElasticsearchService mock 타입
 */
export type MockElasticsearchService = ReturnType<
  typeof createMockElasticsearchService
>;
