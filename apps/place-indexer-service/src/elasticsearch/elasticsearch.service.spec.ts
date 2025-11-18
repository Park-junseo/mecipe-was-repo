import { createMockElasticsearchService } from 'src/test-utils';
import { IndexDocument } from './libs';
import { CAFEINFO_INDEX_NAME } from './libs/indices';

describe('ElasticsearchService', () => {
  let mockIndexDocument: jest.Mock;
  let mockDeleteDocument: jest.Mock;

  beforeEach(() => {
    const testModule = createMockElasticsearchService();
    mockIndexDocument = testModule.mockIndexDocument;
    mockDeleteDocument = testModule.mockDeleteDocument;
  });

  it('indexes documents with provided payload and optional id', async () => {
    const doc = { name: 'cafe' } as IndexDocument<CAFEINFO_INDEX_NAME>;

    await mockIndexDocument({
      index: CAFEINFO_INDEX_NAME,
      id: '123',
      document: doc,
    });

    expect(mockIndexDocument).toHaveBeenCalledWith({
      index: CAFEINFO_INDEX_NAME,
      id: '123',
      document: doc,
    });
  });

  it('deletes documents by id', async () => {
    await mockDeleteDocument({
      index: CAFEINFO_INDEX_NAME,
      id: '123',
    });

    expect(mockDeleteDocument).toHaveBeenCalledWith({
      index: CAFEINFO_INDEX_NAME,
      id: '123',
    });
  });
});
