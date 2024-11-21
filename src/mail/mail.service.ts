import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomInt } from 'crypto';
import { Model, Types } from 'mongoose';
import { ClsService } from 'nestjs-cls';
import { UserService } from '../user/user.service';
import { Verification } from './schema/verification.schema';

@Injectable()
export class MailService {
  constructor(
    @InjectModel(Verification.name)
    private readonly verificationModel: Model<Verification>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly clsService: ClsService,
  ) {}
  private readonly logger = new Logger(MailService.name);

  generateVerificationCode(): number {
    return randomInt(100000, 1000000);
  }

  async createVerificationRecord(
    email: string,
    verificationCode: number,
  ): Promise<Verification> {
    const newVerificationRecord = await this.verificationModel
      .findOneAndReplace(
        { email },
        { email, verificationCode, createdAt: Date.now() },
        { upsert: true, returnDocument: 'after' },
      )
      .lean()
      .exec();

    return newVerificationRecord;
  }

  async sendMail(email: string): Promise<void> {
    const user = await this.userService.findUser({ email });

    if (user.is_verified) {
      throw new ConflictException('Account already verified');
    }

    const verificationCode = this.generateVerificationCode();
    await this.createVerificationRecord(user.email, verificationCode);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          email: user.email,
          username: user.username,
          verificationCode,
          websiteVerificationLink:
            this.configService.getOrThrow<string>('CLIENT_VERIFICATION_URL') +
            user._id,
          directVerificationLink:
            this.configService.getOrThrow<string>('DIRECT_VERIFICATION_URL') +
            `?userId=${user._id}&verificationCode=${verificationCode}`,
        },
      });
      this.logger.log(
        `Successfully sent mail to ${user.email} - ReqId: ${this.clsService.get('reqId')}`,
      );
    } catch (error) {
      this.logger.error(
        `Error when sending mail to ${user.email} - ReqId: ${this.clsService.get('reqId')}`,
        error,
      );

      await this.verificationModel
        .deleteOne({ email: user.email })
        .lean()
        .exec();

      throw new InternalServerErrorException();
    }
  }

  async verifyAccount({
    userId,
    email,
    verificationCode,
  }: {
    userId: Types.ObjectId | undefined;
    email: string | undefined;
    verificationCode: number;
  }): Promise<void> {
    let user;
    if (userId) {
      user = await this.userService.findUserById(userId);
    } else {
      user = await this.userService.findUser({ email });
    }

    if (user.is_verified) {
      throw new ConflictException('Account already verified');
    }

    const verificationRecord = await this.verificationModel.exists({
      email: user.email,
      verificationCode,
    });

    if (!verificationRecord) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userService.verifyUserByEmail(user.email);

    await this.verificationModel
      .deleteOne({ _id: verificationRecord._id })
      .lean()
      .exec();
  }
}
