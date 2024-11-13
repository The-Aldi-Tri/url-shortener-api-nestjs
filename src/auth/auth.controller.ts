import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordAuthDto } from './dto/change-password-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guard/jwt-refresh-auth.guard';
import { AuthenticatedRequest } from './type/AuthenticatedRequest.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiCreatedResponse({ description: 'User successfully created' })
  @ApiConflictResponse({ description: 'Duplicate field' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  async signup(@Body() signupAuthDto: SignupAuthDto) {
    const addedUser = await this.authService.signup(signupAuthDto);
    return { message: 'User successfully created', data: addedUser };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    type: LoginAuthDto,
    examples: {
      'Login with username': {
        value: {
          username: 'user123',
          password: 'StrongPa5$',
        },
      },
      'Login with email': {
        value: {
          email: 'user@example.com',
          password: 'StrongPa5$',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Login success' })
  @ApiBadRequestResponse({ description: 'Password is incorrect' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  async login(@Body() loginAuthDto: LoginAuthDto) {
    const tokens = await this.authService.login(loginAuthDto);
    return { message: 'Login success', data: tokens };
  }

  @ApiBearerAuth()
  @Get('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiOkResponse({ description: 'Refresh token success' })
  @ApiUnauthorizedResponse({ description: 'Token not valid or not present' })
  @ApiNotFoundResponse({ description: 'User not found' })
  refresh(@Req() req: AuthenticatedRequest) {
    const { id } = req.user;
    const newAccessToken = this.authService.generateAccessToken({ sub: id });
    return {
      message: 'Refresh token success',
      data: { accessToken: newAccessToken },
    };
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Change password success' })
  @ApiBadRequestResponse({ description: 'Password is incorrect' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Data validation failed' })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordAuthDto: ChangePasswordAuthDto,
  ) {
    const { id } = req.user;
    await this.authService.changePassword(id, changePasswordAuthDto);
    return { message: 'Password successfully changed' };
  }
}