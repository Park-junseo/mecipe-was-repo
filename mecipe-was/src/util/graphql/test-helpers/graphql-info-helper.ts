import { 
  GraphQLResolveInfo, 
  GraphQLSchema, 
  GraphQLObjectType, 
  GraphQLString, 
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  parse,
  validate,
  buildSchema,
} from 'graphql';
import { buildExecutionContext } from 'graphql/execution/execute';

/**
 * GraphQL 쿼리 문자열로부터 실제 GraphQLResolveInfo 객체를 생성하는 헬퍼 함수
 * 
 * @param query GraphQL 쿼리 문자열
 * @param schema GraphQL 스키마 (옵션, 제공되지 않으면 기본 스키마 생성)
 * @param operationName 쿼리 operation 이름
 * @param fieldName 추출할 필드 이름
 * @returns GraphQLResolveInfo 객체
 * 
 * @example
 * ```typescript
 * const info = createGraphQLResolveInfo(
 *   `query {
 *     findPaginatedCafeInfos(limit: 10) {
 *       edges {
 *         node {
 *           id
 *           name
 *           address
 *         }
 *       }
 *     }
 *   }`,
 *   'findPaginatedCafeInfos'
 * );
 * ```
 */
export function createGraphQLResolveInfo(
  query: string,
  fieldName: string,
  schema?: GraphQLSchema,
  operationName?: string,
): GraphQLResolveInfo {
  // 쿼리 파싱
  const document = parse(query);
  
  // 기본 스키마 생성 (제공되지 않은 경우)
  const testSchema = schema || createTestSchema();
  
  // 쿼리 검증
  const validationErrors = validate(testSchema, document);
  if (validationErrors.length > 0) {
    throw new Error(`GraphQL validation errors: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  // Execution context 생성
  const executionContext = buildExecutionContext({
    schema: testSchema,
    document,
    variableValues: {},
    operationName,
    rootValue: {},
  });

  if (Array.isArray(executionContext)) {
    throw new Error(`GraphQL execution errors: ${executionContext.map(e => e.message).join(', ')}`);
  }

  if (!executionContext || !('operation' in executionContext)) {
    throw new Error('Failed to build execution context');
  }

  // fieldName에 해당하는 field node 찾기
  const operation = executionContext.operation;
  if (!operation) {
    throw new Error('Operation not found');
  }

  const fieldNode = operation.selectionSet.selections.find(
    (selection) => selection.kind === 'Field' && selection.name.value === fieldName
  ) as any;

  if (!fieldNode) {
    throw new Error(`Field '${fieldName}' not found in query`);
  }

  // GraphQLResolveInfo 객체 구성
  const info: GraphQLResolveInfo = {
    fieldName,
    fieldNodes: [fieldNode],
    returnType: getReturnTypeForField(testSchema, 'Query', fieldName) as any,
    parentType: testSchema.getQueryType() as any,
    path: {
      key: fieldName,
      prev: undefined,
      typename: 'Query',
    },
    schema: testSchema,
    fragments: {},
    rootValue: {},
    operation,
    variableValues: {},
  };

  return info;
}

/**
 * 기본 테스트용 GraphQL 스키마 생성
 * parseResolveInfo가 작동하려면 모든 타입이 완전히 정의되어 있어야 함
 */
function createTestSchema(): GraphQLSchema {
  // RegionCategory 타입 (CafeInfo의 관계 필드를 위해 필요)
  const RegionCategoryType = new GraphQLObjectType({
    name: 'RegionCategory',
    fields: () => ({
      id: { type: GraphQLInt },
      name: { type: GraphQLString },
      govermentType: { type: GraphQLString },
    }),
  });

  // 기본 CafeInfo 타입
  const CafeInfoType = new GraphQLObjectType({
    name: 'CafeInfo',
    fields: () => ({
      id: { type: GraphQLInt },
      name: { type: GraphQLString },
      address: { type: GraphQLString },
      createdAt: { type: GraphQLString },
      isDisable: { type: GraphQLString },
      code: { type: GraphQLString },
      directions: { type: GraphQLString },
      businessNumber: { type: GraphQLString },
      ceoName: { type: GraphQLString },
      regionCategoryId: { type: GraphQLInt },
      RegionCategory: { type: RegionCategoryType },
    }),
  });

  // Edge 타입 - 실제 NestJS에서 생성되는 이름은 CafeInfoConnectionEdge
  const CafeInfoEdgeType = new GraphQLObjectType({
    name: 'CafeInfoConnectionEdge',  // 실제 타입 이름: ${ConnectionName}Edge
    fields: () => ({
      node: { type: CafeInfoType },
      cursor: { type: GraphQLString },
    }),
  });

  // PageInfo 타입
  const PageInfoType = new GraphQLObjectType({
    name: 'PageInfo',
    fields: () => ({
      hasNextPage: { type: new GraphQLNonNull(GraphQLString) },
      hasPreviousPage: { type: new GraphQLNonNull(GraphQLString) },
      startCursor: { type: GraphQLString },
      endCursor: { type: GraphQLString },
    }),
  });

  // Connection 타입
  const CafeInfoConnectionType = new GraphQLObjectType({
    name: 'CafeInfoConnection',
    fields: () => ({
      edges: { type: new GraphQLList(CafeInfoEdgeType) },
      pageInfo: { type: PageInfoType },
      totalCount: { type: GraphQLInt },
    }),
  });

  // Query 타입
  const QueryType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      findPaginatedCafeInfos: {
        type: CafeInfoConnectionType,
        args: {
          limit: { type: GraphQLInt },
          page: { type: GraphQLInt },
          after: { type: GraphQLString },
        },
      },
    }),
  });

  return new GraphQLSchema({
    query: QueryType,
    types: [QueryType, CafeInfoConnectionType, CafeInfoEdgeType, CafeInfoType, PageInfoType, RegionCategoryType],
  });
}

/**
 * 스키마에서 특정 타입의 필드에 대한 반환 타입 가져오기
 */
function getReturnTypeForField(
  schema: GraphQLSchema,
  typeName: string,
  fieldName: string,
): any {
  const type = schema.getType(typeName);
  if (!type || !('getFields' in type)) {
    return null;
  }
  
  const fields = (type as GraphQLObjectType).getFields();
  const field = fields[fieldName];
  return field?.type || null;
}

/**
 * 더 간단한 방법: GraphQL 쿼리 문자열만으로 fieldNodes를 직접 구성
 * 이 방법은 실제 실행 컨텍스트 없이도 작동합니다.
 * 
 * 주의: 이 함수는 실제 GraphQL execution을 시뮬레이션하므로,
 * parseResolveInfo가 올바르게 파싱할 수 있는 구조의 fieldNodes를 생성합니다.
 */
export function createGraphQLResolveInfoFromQuery(
  query: string,
  fieldName: string,
): GraphQLResolveInfo {
  const document = parse(query);
  
  // 테스트 스키마 생성 및 검증
  const testSchema = createTestSchema();
  
  // 쿼리 검증
  const validationErrors = validate(testSchema, document);
  if (validationErrors.length > 0) {
    throw new Error(`GraphQL validation errors: ${validationErrors.map(e => e.message).join(', ')}`);
  }

  // Execution context를 통해 실제 GraphQL execution 시뮬레이션
  const executionContext = buildExecutionContext({
    schema: testSchema,
    document,
    variableValues: {},
    rootValue: {},
  });

  if (Array.isArray(executionContext)) {
    throw new Error(`GraphQL execution errors: ${executionContext.map(e => e.message).join(', ')}`);
  }

  if (!executionContext || !('operation' in executionContext)) {
    throw new Error('Failed to build execution context');
  }

  const operation = executionContext.operation;
  if (!operation || !operation.selectionSet) {
    throw new Error('Query operation not found');
  }

  const fieldNode = operation.selectionSet.selections.find(
    (selection) => selection.kind === 'Field' && selection.name.value === fieldName
  ) as any;

  if (!fieldNode) {
    throw new Error(`Field '${fieldName}' not found in query`);
  }

  // GraphQLResolveInfo 구성 - execution context를 사용하여 실제 구조 생성
  const queryType = testSchema.getQueryType();
  if (!queryType) {
    throw new Error('Query type not found in schema');
  }

  const fieldDefinition = queryType.getFields()[fieldName];
  if (!fieldDefinition) {
    throw new Error(`Field '${fieldName}' not found in Query type`);
  }

  const info: GraphQLResolveInfo = {
    fieldName,
    fieldNodes: [fieldNode],
    returnType: fieldDefinition.type,
    parentType: queryType,
    path: {
      key: fieldName,
      prev: undefined,
      typename: 'Query',
    },
    schema: testSchema,
    fragments: {},
    rootValue: {},
    operation,
    variableValues: {},
    cacheControl: {} as any,
  } as GraphQLResolveInfo;

  return info;
}

