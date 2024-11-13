import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { ChangePasswordAuthDto } from './dto/change-password-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { JwtPayload } from './type/JwtPayload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET_ACCESS_TOKEN'),
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_EXPIRATION_ACCESS_TOKEN',
      ),
    });
  }

  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET_REFRESH_TOKEN'),
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_EXPIRATION_REFRESH_TOKEN',
      ),
    });
  }

  async hash(plainText: string): Promise<string> {
    return await bcrypt.hash(
      plainText,
      Number(this.configService.getOrThrow<string>('HASH_SALT')),
    );
  }

  async compareHash(plainText: string, hashedText: string): Promise<boolean> {
    return await bcrypt.compare(plainText, hashedText);
  }

  async signup(signupAuthDto: SignupAuthDto): Promise<User> {
    const { password } = signupAuthDto;

    signupAuthDto.password = await this.hash(password);

    const createdUser = await this.userService.create(signupAuthDto);

    return createdUser;
  }

  async login(
    loginAuthDto: LoginAuthDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { username, email, password } = loginAuthDto;

    const user = await this.userService.findOne({ username, email });

    const storedPassword = await this.userService.getUserPassword(user._id);

    const isPasswordMatch = await this.compareHash(password, storedPassword);
    if (!isPasswordMatch) {
      throw new BadRequestException('Password is incorrect');
    }

    const jwtPayload: JwtPayload = { sub: user._id };

    return {
      accessToken: this.generateAccessToken(jwtPayload),
      refreshToken: this.generateRefreshToken(jwtPayload),
    };
  }

  async changePassword(
    id: Types.ObjectId,
    changePasswordAuthDto: ChangePasswordAuthDto,
  ): Promise<void> {
    const { password, newPassword } = changePasswordAuthDto;

    const storedPassword = await this.userService.getUserPassword(id);

    const isPasswordMatch = await this.compareHash(password, storedPassword);
    if (!isPasswordMatch) {
      throw new BadRequestException('Password is incorrect');
    }

    const newHashedPassword = await this.hash(newPassword);
    await this.userService.updateById(id, { password: newHashedPassword });
  }
}