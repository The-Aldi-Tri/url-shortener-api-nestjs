import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schema/user.schema';
import { CreateUserType } from './type/CreateUser.type';
import { IdentifierUserType } from './type/IdentifierUser.type';
import { UpdateUserType } from './type/UpdateUser.type';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  // About lean https://mongoosejs.com/docs/api/query.html#Query.prototype.lean()

  async create(userData: CreateUserType): Promise<User> {
    const userDoc = await this.userModel.create(userData);

    const addedUser = userDoc.toObject();

    delete addedUser.password;
    delete addedUser.__v;

    return addedUser;
  }

  async findById(id: Types.ObjectId): Promise<User> {
    const user = await this.userModel.findById(id).lean().exec();

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return user;
  }

  async findOne(identifier: IdentifierUserType): Promise<User> {
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

  async updateById(
    id: Types.ObjectId,
    updateUserData: UpdateUserType,
  ): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserData, {
        returnDocument: 'after',
      })
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User not found`);
    }

    return updatedUser;
  }

  async removeById(id: Types.ObjectId): Promise<User> {
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
    const user = await this.userModel.findById(id, 'password').lean().exec();

    if (!user || !user.password) {
      throw new NotFoundException(`User not found`);
    }

    return user.password;
  }
}
