import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SendMailDto } from './dto/send-mail.dto';
import { VerifyMailDto } from './dto/verify-mail.dto';
import { MailService } from './mail.service';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 1, ttl: 30000 } })
  async send(@Body() sendMailDto: SendMailDto) {
    const { email } = sendMailDto;

    await this.mailService.sendMail(email);

    return { statusCode: 200, message: 'Verification mail sent' };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 30000 } })
  async verify(@Body() verifyMailDto: VerifyMailDto) {
    const { email, userId, verificationCode } = verifyMailDto;

    await this.mailService.verifyAccount({ userId, email, verificationCode });

    return { statusCode: 200, message: 'Verification success' };
  }
}
