import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schema/user.schema';
import { CreateUserType } from './type/CreateUser.type';
import { IdentifierUserType } from './type/IdentifierUser.type';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async createUser(userData: CreateUserType): Promise<User> {
    const addedUserDoc = await this.userModel.create({
      email: userData.email,
      username: userData.username,
      password: userData.hashedPassword,
    });

    const addedUser = addedUserDoc.toObject();

    delete addedUser.password;
    delete addedUser.__v;

    return addedUser;
  }

  async findUserById(id: Types.ObjectId): Promise<User> {
    const user = await this.userModel.findById(id).lean().exec();

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return user;
  }

  async findUser(identifier: IdentifierUserType): Promise<User> {
    const user = await this.userModel
      .findOne({
        $or: [{ email: identifier.email }, { username: identifier.username }],
      })
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return user;
  }

  async resetUserPassword(
    id: Types.ObjectId,
    newHashedPassword: string,
  ): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { password: newHashedPassword },
        {
          returnDocument: 'after',
        },
      )
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User not found`);
    }

    return updatedUser;
  }

  async updateUserUsername(
    id: Types.ObjectId,
    newUsername: string,
  ): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { username: newUsername },
        {
          returnDocument: 'after',
        },
      )
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User not found`);
    }

    return updatedUser;
  }

  async deleteUser(id: Types.ObjectId): Promise<User> {
    const deletedUser = await this.userModel
      .findByIdAndDelete(id)
      .lean()
      .exec();

    if (!deletedUser) {
      throw new NotFoundException(`User not found`);
    }

    return deletedUser;
  }

  async checkUserExist(id: Types.ObjectId): Promise<boolean> {
    const user = await this.userModel.exists({ _id: id }).exec();
    return user ? true : false;
  }

  async getUserPassword(id: Types.ObjectId): Promise<string> {
    const user = await this.userModel.findById(id, '+password').lean().exec();

    if (!user || !user.password) {
      throw new NotFoundException(`User not found`);
    }

    return user.password;
  }

  async verifyUserByEmail(email: string): Promise<void> {
    const verifiedUser = await this.userModel
      .findOneAndUpdate(
        { email },
        {
          is_verified: true,
        },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!verifiedUser) {
      throw new NotFoundException('User not found');
    }
  }
}
