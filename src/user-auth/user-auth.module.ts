import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { UserAuthController } from './user-auth.controller';

/**
 * This module is designed to decouple
 * the User and Auth modules,
 * preventing circular dependencies
 */
@Module({
  imports: [UserModule, AuthModule],
  providers: [],
  controllers: [UserAuthController],
})
export class UserAuthModule {}
