// Common types
export interface ServiceConfig {
  name: string;
  port: number;
  version: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  checks: {
    database?: boolean;
    redis?: boolean;
    kafka?: boolean;
  };
}





