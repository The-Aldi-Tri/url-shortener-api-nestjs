import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtRefreshStrategy } from './strategy/jwt-refresh.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';

@Module({
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  imports: [ConfigModule, JwtModule, PassportModule, UserModule],
  exports: [JwtModule, PassportModule],
  controllers: [AuthController],
})
export class AuthModule {}
