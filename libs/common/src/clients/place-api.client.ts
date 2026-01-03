import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CafeInfoDto } from '../dto/cafe-info.dto';
import { ServiceUnavailableError } from '../errors/service-error';

/**
 * HTTP client for communicating with place-api-service
 * This should be used when synchronous communication is needed
 * For asynchronous communication, use Kafka events instead
 */
@Injectable()
export class PlaceApiClient {
  constructor(
    @Inject('PLACE_API_SERVICE_URL')
    private readonly baseUrl: string,
    private readonly httpService: HttpService,
  ) {}

  async getCafeInfo(id: number): Promise<CafeInfoDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<CafeInfoDto>(`${this.baseUrl}/places/${id}`),
      );
      return response.data;
    } catch (error) {
      throw new ServiceUnavailableError('place-api-service');
    }
  }

  async getCafeInfoByCode(code: string): Promise<CafeInfoDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<CafeInfoDto>(
          `${this.baseUrl}/places/code/${code}`,
        ),
      );
      return response.data;
    } catch (error) {
      throw new ServiceUnavailableError('place-api-service');
    }
  }
}





