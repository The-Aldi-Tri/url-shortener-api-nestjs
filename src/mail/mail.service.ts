import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../user/user.service';
import { Otp } from './schema/otp.schema';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    @InjectModel(Otp.name) private readonly otpModel: Model<Otp>,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}
  private readonly logger = new Logger(MailService.name);

  generateVerificationCode(): number {
    return Math.floor(100000 + Math.random() * 900000); // range 100000 - 999999
  }

  async createOtp(email: string, otp: number): Promise<Otp> {
    const newOtp = await this.otpModel
      .findOneAndReplace(
        { email },
        { email, otp, createdAt: Date.now() },
        { upsert: true, returnDocument: 'after' },
      )
      .lean()
      .exec();

    return newOtp;
  }

  async sendMail(email: string, username: string): Promise<void> {
    const otp = this.generateVerificationCode();

    await this.createOtp(email, otp);

    try {
      await this.mailerService.sendMail({
        to: email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          username,
          otp,
          websiteVerificationLink: this.configService.getOrThrow<string>(
            'CLIENT_VERIFICATION_URL',
          ),
          directVerificationLink:
            this.configService.getOrThrow<string>('API_VERIFICATION_URL') +
            `?email=${email}&otp=${otp}`,
        },
      });
      this.logger.log(`Successfully sent mail to ${email}`);
    } catch (error) {
      this.logger.error(`Error when sending mail to ${email}`, error);

      await this.otpModel.deleteOne({ email }).lean().exec();

      throw new InternalServerErrorException();
    }
  }

  async verifyEmail(email: string, otp: number): Promise<void> {
    const otpDoc = await this.otpModel.exists({ email, otp });

    if (!otpDoc || !otpDoc._id) {
      throw new BadRequestException('Verification failed');
    }

    await this.userService.verifyUserByEmail(email);

    await this.otpModel.deleteOne({ _id: otpDoc._id }).lean().exec();
  }
}
