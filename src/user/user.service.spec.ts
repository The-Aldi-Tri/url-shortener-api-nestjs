import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { faker } from '../../test/utils/faker';
import { generateStrongPassword } from '../../test/utils/generateStrongPassword';
import { User } from './schema/user.schema';
import { CreateUserType } from './type/CreateUser.type';
import { IdentifierUserType } from './type/IdentifierUser.type';
import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;

  const mockUserModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    exists: jest.fn(),
    findOneAndUpdate: jest.fn(),
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
    faker.seed(1);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('createUser function', () => {
    it('should create a new user and return it without password and __v', async () => {
      const userData: CreateUserType = {
        email: faker.internet.email(),
        username: faker.internet.username(),
        hashedPassword: await bcrypt.hash(generateStrongPassword(), 10),
      };

      const mockAddedUser: User = generateUser(false);
      mockAddedUser.email = userData.email;
      mockAddedUser.username = userData.username;

      mockUserModel.create.mockResolvedValueOnce({
        toObject: jest.fn().mockReturnValueOnce({ ...mockAddedUser }),
      });

      const addedUser = await userService.createUser(userData);

      expect(mockUserModel.create).toHaveBeenCalledWith({
        email: userData.email,
        username: userData.username,
        password: userData.hashedPassword,
      });
      expect(addedUser).toEqual(mockAddedUser);
      expect(addedUser).not.toHaveProperty('password');
      expect(addedUser).not.toHaveProperty('__v');
    });
  });

  describe('findUserById function', () => {
    it('should return user when found', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      const mockUser: User = generateUser();
      mockUser._id = id;

      mockUserModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce({ ...mockUser }),
        }),
      });

      const user = await userService.findUserById(id);

      expect(mockUserModel.findById).toHaveBeenCalledWith(id);
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      mockUserModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      await expect(userService.findUserById(id)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(mockUserModel.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('findUser function', () => {
    it('should return user when found by email or username', async () => {
      const username = faker.internet.username();

      const identifier: IdentifierUserType = {
        username: username,
      };

      const mockUser: User = generateUser();
      mockUser.username = username;

      mockUserModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce({ ...mockUser }),
        }),
      });

      const user = await userService.findUser(identifier);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: identifier.email }, { username: identifier.username }],
      });
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const identifier: IdentifierUserType = { email: faker.internet.email() };

      mockUserModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      expect(userService.findUser(identifier)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: identifier.email }, { username: identifier.username }],
      });
    });
  });

  describe('resetUserPassword function', () => {
    it('should reset password and return updated user', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());
      const newHashedPassword = await bcrypt.hash(generateStrongPassword(), 10);

      const mockUpdatedUser: User = generateUser();
      mockUpdatedUser._id = id;

      mockUserModel.findByIdAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce({ ...mockUpdatedUser }),
        }),
      });

      const updatedUser = await userService.resetUserPassword(
        id,
        newHashedPassword,
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { password: newHashedPassword },
        {
          returnDocument: 'after',
        },
      );
      expect(updatedUser).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());
      const newHashedPassword = await bcrypt.hash(generateStrongPassword(), 10);

      mockUserModel.findByIdAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      await expect(
        userService.resetUserPassword(id, newHashedPassword),
      ).rejects.toThrow(new NotFoundException(`User not found`));
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { password: newHashedPassword },
        {
          returnDocument: 'after',
        },
      );
    });
  });

  describe('updateUserUsername function', () => {
    it('should return updated user', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());
      const newUsername = faker.internet.username();

      const mockUpdatedUser: User = generateUser();
      mockUpdatedUser._id = id;
      mockUpdatedUser.username = newUsername;

      mockUserModel.findByIdAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce({ ...mockUpdatedUser }),
        }),
      });

      const updatedUser = await userService.updateUserUsername(id, newUsername);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { username: newUsername },
        {
          returnDocument: 'after',
        },
      );
      expect(updatedUser).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());
      const newUsername = faker.internet.username();

      mockUserModel.findByIdAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      await expect(
        userService.updateUserUsername(id, newUsername),
      ).rejects.toThrow(new NotFoundException(`User not found`));
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { username: newUsername },
        {
          returnDocument: 'after',
        },
      );
    });
  });

  describe('deleteUser function', () => {
    it('should return deleted user', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      const mockDeletedUser: User = generateUser();
      mockDeletedUser._id = id;

      mockUserModel.findByIdAndDelete.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce({ ...mockDeletedUser }),
        }),
      });

      const deletedUser = await userService.deleteUser(id);

      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith(id);
      expect(deletedUser).toEqual(mockDeletedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      mockUserModel.findByIdAndDelete.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      await expect(userService.deleteUser(id)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith(id);
    });
  });

  describe('checkUserExist function', () => {
    it('should return true if user exists', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      const mockUser = { _id: id };

      mockUserModel.exists.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce({ ...mockUser }),
      });

      const isExist = await userService.checkUserExist(id);

      expect(mockUserModel.exists).toHaveBeenCalledWith({ _id: id });
      expect(isExist).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      mockUserModel.exists.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      const isExist = await userService.checkUserExist(id);

      expect(mockUserModel.exists).toHaveBeenCalledWith({ _id: id });
      expect(isExist).toBe(false);
    });
  });

  describe('getUserPassword function', () => {
    it('should return user password', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      const mockUser: User = generateUser();
      mockUser._id = id;
      mockUser.password = await bcrypt.hash(generateStrongPassword(), 10);

      mockUserModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce({ ...mockUser }),
        }),
      });

      const userPassword = await userService.getUserPassword(id);

      expect(mockUserModel.findById).toHaveBeenCalledWith(id, '+password');
      expect(userPassword).toEqual(mockUser.password);
    });

    it('should throw NotFoundException when user not found', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      mockUserModel.findById.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      await expect(userService.getUserPassword(id)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(mockUserModel.findById).toHaveBeenCalledWith(id, '+password');
    });
  });

  describe('verifyUserByEmail function', () => {
    it('should verify user by email', async () => {
      const email = faker.internet.email();

      const mockUser: User = generateUser();
      mockUser.email = email;

      mockUserModel.findOneAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce({ mockUser }),
        }),
      });

      await userService.verifyUserByEmail(email);

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email },
        {
          is_verified: true,
        },
        { returnDocument: 'after' },
      );
    });

    it('should throw error when user not found', async () => {
      const email = faker.internet.email();

      mockUserModel.findOneAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      await expect(userService.verifyUserByEmail(email)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email },
        {
          is_verified: true,
        },
        { returnDocument: 'after' },
      );
    });
  });
});
