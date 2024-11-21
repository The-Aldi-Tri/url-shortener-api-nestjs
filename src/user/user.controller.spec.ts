import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { faker } from '../..//test/utils/faker';
import { GetUnverifiedUserDto } from './dto/get-unverified-user.dto';
import { User } from './schema/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let userController: UserController;

  const mockUserService = {
    findUserById: jest.fn(),
    findUser: jest.fn(),
  };

  const generateUser = (is_verified = true): User => ({
    email: faker.internet.email(),
    username: faker.internet.username(),
    is_verified: is_verified,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    _id: new Types.ObjectId(faker.database.mongodbObjectId()),
  });

  beforeAll(() => {
    faker.seed(20);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    userController = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  describe('findUnverifiedUser', () => {
    it('should return a user if unverified by userId', async () => {
      const user = generateUser(false);

      const body: GetUnverifiedUserDto = { userId: user._id };

      const mockResult = {
        statusCode: 200,
        message: 'User (unverified) successfully retrieved',
        data: {
          userId: user._id,
          email: user.email,
          username: user.username,
        },
      };

      mockUserService.findUserById.mockResolvedValue({ ...user });

      const result = await userController.findUnverifiedUser(body);

      expect(result.statusCode).toBe(200);
      expect(result).toEqual(mockResult);
    });

    it('should return a user if unverified by username and email', async () => {
      const user = generateUser(false);

      const body: GetUnverifiedUserDto = {
        username: user.username,
        email: user.email,
      };

      const mockResult = {
        statusCode: 200,
        message: 'User (unverified) successfully retrieved',
        data: {
          userId: user._id,
          email: user.email,
          username: user.username,
        },
      };

      mockUserService.findUser.mockResolvedValue({ ...user });

      const result = await userController.findUnverifiedUser(body);

      expect(result.statusCode).toBe(200);
      expect(result).toEqual(mockResult);
    });

    it('should throw ForbiddenException if the user is already verified', async () => {
      const user = generateUser();

      const body: GetUnverifiedUserDto = { userId: user._id };

      mockUserService.findUserById.mockResolvedValue({ ...user });

      await expect(userController.findUnverifiedUser(body)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if the user is already verified by username and email', async () => {
      const user = generateUser();

      const body: GetUnverifiedUserDto = {
        username: user.username,
        email: user.email,
      };

      mockUserService.findUser.mockResolvedValue({ ...user });

      await expect(userController.findUnverifiedUser(body)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
