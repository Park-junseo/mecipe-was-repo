// src/common/pagination/base-edge.type.ts
import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';
import { NodeLocation } from '../types';

// TNode는 GraphQL의 ObjectType 데코레이터가 적용될 클래스여야 함
export function createBaseEdgeType<TNode>(
  nodeRef: () => Type<TNode>, // 실제 Node 타입의 참조 (예: () => CafeInfo)
  name: string,   // Edge 타입의 이름 (예: 'CafeInfoEdge')
): { EdgeType: Type<{ node: Partial<TNode>; cursor: string }>; nodeLocation: NodeLocation } { // 반환되는 클래스의 TypeScript 타입 정의

  const NodeType = nodeRef(); // 함수를 호출해서 실제 타입 클래스를 가져옴

  @ObjectType(name) // ✨ NestJS @ObjectType 데코레이터에 동적 이름 부여 ✨
  class EdgeType { // 제네릭 TNode를 사용
    @Field(() => NodeType, { description: '노드 데이터' })
    node: Partial<TNode>; // 제네릭 TNode를 사용

    @Field(() => String, { description: '이 노드에 대한 고유 커서' })
    cursor: string;
  }
  return {
    EdgeType,
    nodeLocation: [{name: name, property: 'node'}]
  };
}