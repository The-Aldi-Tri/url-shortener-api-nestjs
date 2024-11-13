import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { Url, UrlSchema } from './schema/url.schema';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Url.name, schema: UrlSchema }]),
    UserModule,
    AuthModule,
  ],
  controllers: [UrlController],
  providers: [UrlService],
})
export class UrlModule {}
