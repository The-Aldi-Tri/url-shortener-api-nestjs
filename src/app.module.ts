import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
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
import { MailModule } from './mail/mail.module';
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
          process.env.NODE_ENV === 'production'
            ? configService.getOrThrow<string>('DATABASE_URI')
            : configService.getOrThrow<string>('DATABASE_URI_TEST');
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
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          transport: {
            host: configService.getOrThrow<string>('SMTP_HOST'),
            port: configService.getOrThrow<string>('SMTP_PORT'),
            auth: {
              user: configService.getOrThrow<string>('SMTP_USER'),
              pass: configService.getOrThrow<string>('SMTP_PASS'),
            },
            secure: true, // connect to the SMTP server on the standard SSL/TLS port (usually port 465)
          },
          template: {
            dir: __dirname + '/../templates',
            adapter: new PugAdapter({ inlineCssEnabled: true }),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
    UserModule,
    AuthModule,
    UrlModule,
    UserAuthModule,
    MailModule,
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
