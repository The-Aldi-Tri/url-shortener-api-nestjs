import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { faker } from '../../test/utils/faker';
import { AuthenticatedRequest } from '../auth/type/AuthenticatedRequest.type';
import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { UpdateUserAuthDto } from './dto/update-user-auth.dto';
import { UserAuthController } from './user-auth.controller';

describe('UserAuthController', () => {
  let userAuthController: UserAuthController;

  const mockUserService = {
    findUserById: jest.fn(),
    updateUserUsername: jest.fn(),
    deleteUser: jest.fn(),
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
    faker.seed(4);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAuthController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    userAuthController = module.get<UserAuthController>(UserAuthController);
  });

  it('should be defined', () => {
    expect(userAuthController).toBeDefined();
  });

  describe('findOne', () => {
    it('should return the user successfully', async () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;

      const user = generateUser();
      user._id = req.user.id;

      const mockResult = {
        statusCode: 200,
        message: 'User successfully retrieved',
        data: user,
      };
      mockUserService.findUserById.mockResolvedValue({ ...user });

      const result = await userAuthController.findOne(req);

      expect(result).toEqual(mockResult);
      expect(mockUserService.findUserById).toHaveBeenCalledWith(req.user.id);
    });
  });

  describe('update', () => {
    it('should return the updated user successfully', async () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;

      const updateUserAuthDto: UpdateUserAuthDto = {
        username: faker.internet.username(),
      };

      const updatedUser = {
        ...generateUser(),
        _id: req.user.id,
        ...updateUserAuthDto,
      };

      const mockResult = {
        statusCode: 200,
        message: 'User successfully updated',
        data: updatedUser,
      };

      mockUserService.updateUserUsername.mockResolvedValue({ ...updatedUser });

      const result = await userAuthController.update(req, updateUserAuthDto);

      expect(result).toEqual(mockResult);
      expect(mockUserService.updateUserUsername).toHaveBeenCalledWith(
        req.user.id,
        updateUserAuthDto.username,
      );
    });
  });

  describe('remove', () => {
    it('should return the deleted user successfully', async () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;

      const deletedUser = generateUser();
      deletedUser._id = req.user.id;

      const mockResult = {
        statusCode: 200,
        message: 'User successfully deleted',
        data: deletedUser,
      };
      mockUserService.deleteUser.mockResolvedValue({ ...deletedUser });

      const result = await userAuthController.remove(req);

      expect(result).toEqual(mockResult);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(req.user.id);
    });
  });
});
