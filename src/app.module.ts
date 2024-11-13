import {
  HttpStatus,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Connection } from 'mongoose';
import { ClsModule, ClsService } from 'nestjs-cls';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongoExceptionFilter } from './MongoError.filter';
import { ReqResLoggerMiddleware } from './ReqRes-Logger.middleware';
import { UrlModule } from './url/url.module';
import { UserAuthModule } from './user-auth/user-auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    ClsModule.forRoot({
      middleware: {
        // automatically mount the
        // ClsMiddleware for all routes
        mount: true,
        // and use the setup method to
        // provide default store values.
        setup: (cls, req) => {
          cls.set('reqId', req.headers['x-req-id']);
        },
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule, ClsModule],
      inject: [ConfigService, ClsService],
      useFactory: async (configService: ConfigService, cls: ClsService) => {
        const uri =
          process.env.NODE_ENV === 'test'
            ? configService.getOrThrow<string>('DATABASE_URI_TEST')
            : configService.getOrThrow<string>('DATABASE_URI');
        const logger = new Logger('Mongoose');

        return {
          uri,
          onConnectionCreate: (connection: Connection) => {
            connection.set(
              'debug',
              (
                collectionName: string,
                method: string,
                query: any,
                doc: any,
              ) => {
                const mutateOps = ['update', 'replace', 'delete', 'remove'];
                let logMessage = `${collectionName}.${method} - Query: ${JSON.stringify(query)} - Doc: ${JSON.stringify(doc)}`;

                const reqId = cls.get('reqId');
                if (reqId) {
                  logMessage = logMessage.concat(` - ReqId: ${reqId}`);
                }

                if (mutateOps.some((v) => method.toLowerCase().includes(v))) {
                  logger.warn(logMessage);
                } else {
                  logger.log(logMessage);
                }
              },
            );

            connection.on('connected', () =>
              logger.log('Connection: Connected'),
            );
            connection.on('open', () => logger.log('Connection: Open'));
            connection.on('disconnecting', () =>
              logger.warn('Connection: Disconnecting'),
            );
            connection.on('disconnected', () =>
              logger.warn('Connection: Disconnected'),
            );
            connection.on('reconnected', () =>
              logger.warn('Connection: Reconnected'),
            );

            return connection;
          },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // in ms
        limit: 60,
      },
    ]),
    UserModule,
    AuthModule,
    UrlModule,
    UserAuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useFactory() {
        const logger = new Logger('MongoExceptionFilter');
        return new MongoExceptionFilter(logger);
      },
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ReqResLoggerMiddleware).forRoutes('*');
  }
}
