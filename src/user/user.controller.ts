import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { GetUnverifiedUserDto } from './dto/get-unverified-user.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async findUnverifiedUser(@Body() body: GetUnverifiedUserDto) {
    const { userId, username, email } = body;

    let user;
    if (userId) {
      user = await this.userService.findUserById(new Types.ObjectId(userId));
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
