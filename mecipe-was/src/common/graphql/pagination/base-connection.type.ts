// src/common/pagination/base-connection.type.ts
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';
import { PageInfo } from './page-info.entity';
import { createBaseEdgeType } from './base-edge.type'; // 이전에 정의한 Edge 팩토리
import { NodeLocation } from '../types';

export interface BaseConnectionType<TNode> {
  edges: Array<{ node: Partial<TNode>; cursor: string }>;
  pageInfo: PageInfo;
  totalCount?: number;
}

// TNode는 실제 데이터 노드 타입
export function createBaseConnectionType<TNode>(
  nodeRef: () => Type<TNode>, // 실제 Node 타입의 참조 (예: () => CafeInfo)
  name: string,   // Connection 타입의 이름 (예: 'CafeInfoConnection')
): { ConnectionType: Type<{ edges: Array<{ node: Partial<TNode>; cursor: string }>; pageInfo: PageInfo; totalCount?: number }>; nodeLocation: NodeLocation } { // 반환되는 클래스 타입

  const {EdgeType, nodeLocation} = createBaseEdgeType(nodeRef, `${name}Edge`); // 해당 Connection에 맞는 Edge 타입을 내부적으로 생성

  @ObjectType(name) // ✨ NestJS @ObjectType 데코레이터에 동적 이름 부여 ✨
  class ConnectionType implements BaseConnectionType<TNode> {
    @Field(() => [EdgeType], { description: '엣지 목록' })
    edges: Array<{ node: Partial<TNode>; cursor: string }>;

    @Field(() => PageInfo, { description: '페이징 정보' })
    pageInfo: PageInfo;

    @Field(() => Int, { nullable: true, description: '총 데이터 개수 (옵션)' })
    totalCount?: number;
  }
  return {
    ConnectionType,
    nodeLocation: [{name: name, property: 'edges'}, ...nodeLocation]
  };
}