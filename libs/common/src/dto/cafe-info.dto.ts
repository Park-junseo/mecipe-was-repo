/**
 * CafeInfo DTO for inter-service communication
 * This is a minimal representation used for read operations
 */
export class CafeInfoDto {
  id: number;
  name: string;
  code?: string;
  isDisable: boolean;
  createdAt: Date;

  constructor(data: Partial<CafeInfoDto>) {
    this.id = data.id ?? 0;
    this.name = data.name ?? '';
    this.code = data.code ?? '';
    this.isDisable = data.isDisable ?? false;
    this.createdAt = data.createdAt ?? new Date();
  }
}





