// src/cafe-infos/graphql/types/cafe-info-connection.type.ts
import { createBaseConnectionType } from 'src/common/graphql/pagination/base-connection.type';
import { CafeInfo } from 'src/places/entities/cafe-info.entity';

// CafeInfoConnection 타입 생성
export const {ConnectionType: CafeInfoConnection, nodeLocation: cafeInfoConnectionNodeLocation} = createBaseConnectionType(() => CafeInfo, 'CafeInfoConnection');
export type CafeInfoConnectionType = InstanceType<typeof CafeInfoConnection>;