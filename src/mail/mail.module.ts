import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import { UserModule } from '../user/user.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { Verification, VerificationSchema } from './schema/verification.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Verification.name, schema: VerificationSchema },
    ]),
    UserModule,
    ClsModule,
  ],
  providers: [MailService],
  controllers: [MailController],
})
export class MailModule {}
