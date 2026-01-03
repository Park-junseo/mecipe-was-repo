// src/cafe-infos/graphql/types/cafe-info-connection.type.ts
import { createBaseConnectionType } from '../../../common/graphql/pagination/base-connection.type';
import { CafeInfo } from '../../entities/cafe-info.entity';

// CafeInfoConnection 타입 생성
export const {ConnectionType: CafeInfoConnection, nodeLocation: cafeInfoConnectionNodeLocation} = createBaseConnectionType(() => CafeInfo, 'CafeInfoConnection');
export type CafeInfoConnectionType = InstanceType<typeof CafeInfoConnection>;