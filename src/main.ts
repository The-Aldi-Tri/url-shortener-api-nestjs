import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { WinstonLoggerOptions } from './Winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(WinstonLoggerOptions),
  });

  app.use(helmet());
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  });

  const config = new DocumentBuilder()
    .setTitle('Url Shortener')
    .setDescription('The Url Shortener API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // app.useGlobalFilters(new MongoExceptionFilter());

  const configService = app.get(ConfigService);
  const port = Number(configService.getOrThrow<string>('APP_PORT'));
  await app.listen(port, () => {
    Logger.log(`Server is listening on port ${port}`, 'Server');
  });
}

bootstrap();
