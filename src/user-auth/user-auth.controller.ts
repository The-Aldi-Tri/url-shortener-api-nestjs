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
    const user = await this.userService.findUserById(id);
    return {
      statusCode: 200,
      message: 'User successfully retrieved',
      data: user,
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: UpdateUserAuthDto,
    examples: {
      'Update username': {
        value: {
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
    const { username } = updateUserAuthDto;
    const { id } = req.user;
    const updatedUser = await this.userService.updateUserUsername(id, username);
    return {
      statusCode: 200,
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
    const deletedUser = await this.userService.deleteUser(id);
    return {
      statusCode: 200,
      message: 'User successfully deleted',
      data: deletedUser,
    };
  }
}
