import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/type/AuthenticatedRequest.type';
import { UserService } from '../user/user.service';
import { UpdateUserAuthDto } from './dto/update-user-auth.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserAuthController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'User successfully retrieved' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Req() req: AuthenticatedRequest) {
    const { id } = req.user;
    const user = await this.userService.findById(id);
    return {
      message: 'User successfully retrieved',
      data: user,
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: UpdateUserAuthDto,
    examples: {
      'Update email only': {
        value: {
          email: 'userv2@example.com',
        },
      },
      'Update username only': {
        value: {
          username: 'user123v2',
        },
      },
      'Update email and username': {
        value: {
          email: 'userv2@example.com',
          username: 'user123v2',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'User successfully updated' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Body() updateUserAuthDto: UpdateUserAuthDto,
  ) {
    const { id } = req.user;
    const updatedUser = await this.userService.updateById(
      id,
      updateUserAuthDto,
    );
    return {
      message: 'User successfully updated',
      data: updatedUser,
    };
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'User successfully deleted' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  async remove(@Req() req: AuthenticatedRequest) {
    const { id } = req.user;
    const deletedUser = await this.userService.removeById(id);
    return {
      message: 'User successfully deleted',
      data: deletedUser,
    };
  }
}
