import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Types } from 'mongoose';
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
  @ApiOkResponse({ description: 'Verification mail sent' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Account already verified' })
  async send(@Body() sendMailDto: SendMailDto) {
    const { email } = sendMailDto;

    await this.mailService.sendMail(email);

    return { statusCode: 200, message: 'Verification mail sent' };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 30000 } })
  @ApiOkResponse({ description: 'Verification success' })
  @ApiBadRequestResponse({ description: 'Invalid verification code' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Account already verified' })
  @ApiBody({
    type: VerifyMailDto,
    examples: {
      'Verify with userId': {
        value: {
          userId: new Types.ObjectId(),
          verificationCode: 123456,
        },
      },
      'Verify with email': {
        value: {
          email: 'user@example.com',
          verificationCode: 123456,
        },
      },
    },
  })
  async verify(@Body() verifyMailDto: VerifyMailDto) {
    const { email, userId, verificationCode } = verifyMailDto;

    await this.mailService.verifyAccount({ userId, email, verificationCode });

    return { statusCode: 200, message: 'Verification success' };
  }
}
