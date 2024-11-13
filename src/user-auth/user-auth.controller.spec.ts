import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../auth/type/AuthenticatedRequest.type';
import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { UpdateUserAuthDto } from './dto/update-user-auth.dto';
import { UserAuthController } from './user-auth.controller';

describe('UserAuthController', () => {
  let userAuthController: UserAuthController;
  let userService: UserService;

  const userExample: User = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    username: 'testUser',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userExampleFull: Required<User> = {
    ...userExample,
    password: 'hashedPassword',
    __v: 0,
  };

  const mockUserService = {
    findById: jest.fn(),
    updateById: jest.fn(),
    removeById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAuthController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    userAuthController = module.get<UserAuthController>(UserAuthController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userAuthController).toBeDefined();
  });

  describe('findOne', () => {
    it('should return the user successfully', async () => {
      const req = { user: { id: userExampleFull._id } } as AuthenticatedRequest;
      const user = { ...userExample };
      const mockResult = {
        message: 'User successfully retrieved',
        data: user,
      };
      userService.findById = jest.fn().mockResolvedValue({ ...userExample });

      const result = await userAuthController.findOne(req);

      expect(result).toEqual(mockResult);
      expect(userService.findById).toHaveBeenCalledWith(req.user.id);
    });
  });

  describe('update', () => {
    it('should return the updated user successfully', async () => {
      const req = { user: { id: userExampleFull._id } } as AuthenticatedRequest;
      const updateUserAuthDto: UpdateUserAuthDto = { username: 'newUserName' };
      const updatedUser = {
        ...userExample,
        ...updateUserAuthDto,
      };
      const mockResult = {
        message: 'User successfully updated',
        data: updatedUser,
      };
      userService.updateById = jest.fn().mockResolvedValue({
        ...userExample,
        ...updateUserAuthDto,
      });

      const result = await userAuthController.update(req, updateUserAuthDto);

      expect(result).toEqual(mockResult);
      expect(userService.updateById).toHaveBeenCalledWith(
        req.user.id,
        updateUserAuthDto,
      );
    });
  });

  describe('remove', () => {
    it('should return the deleted user successfully', async () => {
      const req = { user: { id: userExampleFull._id } } as AuthenticatedRequest;
      const deletedUser = { ...userExample };
      const mockResult = {
        message: 'User successfully deleted',
        data: deletedUser,
      };
      userService.removeById = jest.fn().mockResolvedValue({ ...userExample });

      const result = await userAuthController.remove(req);

      expect(result).toEqual(mockResult);
      expect(userService.removeById).toHaveBeenCalledWith(req.user.id);
    });
  });
});
