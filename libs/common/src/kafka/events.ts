import { CafeInfoDto } from '../dto/cafe-info.dto';

/**
 * Kafka event payloads for inter-service communication
 */

export interface CafeInfoCreatedEvent {
  id: number;
  name: string;
  code?: string;
  isDisable: boolean;
  createdAt: Date;
}

export interface CafeInfoUpdatedEvent {
  id: number;
  name?: string;
  code?: string;
  isDisable?: boolean;
}

export interface CafeInfoDeletedEvent {
  id: number;
}

export interface MetaViewerInfoCreatedEvent {
  id: number;
  code: string;
  cafeInfoId: number;
  isDisable: boolean;
  createdAt: Date;
}

export interface MetaViewerInfoUpdatedEvent {
  id: number;
  code?: string;
  cafeInfoId?: number;
  isDisable?: boolean;
}

export interface MetaViewerInfoDeletedEvent {
  id: number;
}





