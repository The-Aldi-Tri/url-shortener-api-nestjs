import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  providers: [UserService],
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
