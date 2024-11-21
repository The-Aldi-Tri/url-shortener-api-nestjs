import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { WinstonLoggerOptions } from './Winston.logger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(WinstonLoggerOptions),
  });
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: [configService.getOrThrow<string>('CORS_ORIGIN')],
  });

  // Trust requests from the loopback address
  // if api used behind proxy server
  app.set('trust proxy', 'loopback');

  const config = new DocumentBuilder()
    .setTitle('Url Shortener')
    .setDescription('The Url Shortener API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const port = Number(configService.getOrThrow<string>('APP_PORT'));
  await app.listen(port, () => {
    Logger.log(`Server is listening on port ${port}`, 'Server');
  });
}

bootstrap();
