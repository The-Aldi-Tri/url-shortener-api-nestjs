import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { GetUnverifiedUserDto } from './dto/get-unverified-user.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User (unverified) successfully retrieved' })
  @ApiForbiddenResponse({ description: 'Account already verified' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  @ApiBody({
    type: GetUnverifiedUserDto,
    examples: {
      'Using username': { value: { username: 'user123' } },
      'Using email': { value: { email: 'user@example.com' } },
      'Using userId': { value: { userId: new Types.ObjectId() } },
    },
  })
  async findUnverifiedUser(@Body() body: GetUnverifiedUserDto) {
    const { userId, username, email } = body;

    let user;
    if (userId) {
      user = await this.userService.findUserById(userId);
    } else {
      user = await this.userService.findUser({ username, email });
    }

    if (user.is_verified) {
      throw new ForbiddenException('Account already verified');
    }

    return {
      statusCode: 200,
      message: 'User (unverified) successfully retrieved',
      data: {
        userId: user._id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
