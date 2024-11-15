import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
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
    const { email, username } = sendMailDto;

    await this.mailService.sendMail(email, username);

    return { statusCode: 200, message: 'Verification mail sent' };
  }

  @Get('verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verify(@Query() verifyMailDto: VerifyMailDto) {
    const { email, otp } = verifyMailDto;

    await this.mailService.verifyEmail(email, otp);

    return { statusCode: 200, message: 'Verification success' };
  }
}
