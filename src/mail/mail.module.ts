import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { Otp, OtpSchema } from './schema/otp.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    UserModule,
  ],
  providers: [MailService],
  controllers: [MailController],
})
export class MailModule {}
