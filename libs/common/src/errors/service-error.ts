/**
 * Common service errors
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly serviceName: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ServiceUnavailableError extends ServiceError {
  constructor(serviceName: string) {
    super(`Service ${serviceName} is unavailable`, serviceName, 503);
    this.name = 'ServiceUnavailableError';
  }
}





