import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '../constants';

/**
 * Kafka module for inter-service communication
 * This module should be imported in services that need to publish or consume events
 */
@Module({})
export class KafkaModule {
  static forRoot(options: {
    brokers: string[];
    clientId: string;
    groupId?: string;
  }): DynamicModule {
    return {
      module: KafkaModule,
      imports: [
        ClientsModule.register([
          {
            name: 'KAFKA_SERVICE',
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: options.clientId,
                brokers: options.brokers,
              },
              consumer: options.groupId
                ? {
                    groupId: options.groupId,
                  }
                : undefined,
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}





