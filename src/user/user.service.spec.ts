import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Query, Types } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { CreateUserType } from './type/CreateUser.type';
import { IdentifierUserType } from './type/IdentifierUser.type';
import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;
  let userModel: Model<User>;

  const userExample: User = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    username: 'testUser',
    is_verified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userExampleFull: Required<User> = {
    ...userExample,
    password: 'hashedPassword',
    __v: 0,
  };

  const mockUserModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
  };

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
    userModel = module.get<Model<User>>(getModelToken(User.name));
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
        email: userExampleFull.email,
        username: userExampleFull.username,
        hashedPassword: userExampleFull.password,
      };

      const mockUserDoc = {
        ...userExample,
      } as UserDocument;

      const mockAddedUser: User = {
        ...userExample,
      };

      userModel.create = jest.fn().mockResolvedValue(mockUserDoc);
      mockUserDoc.toObject = jest.fn().mockReturnValue({ ...userExample });

      const addedUser = await userService.createUser(userData);

      expect(userModel.create).toHaveBeenCalledWith({
        ...userData,
        password: userData.hashedPassword,
      });
      expect(mockUserDoc.toObject).toHaveBeenCalled();
      expect(addedUser).toEqual(mockAddedUser);
    });
  });

  describe('findUserById function', () => {
    it('should return user when found', async () => {
      const id = userExampleFull._id;
      const mockUser: User = { ...userExample };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);

      const user = await userService.findUserById(id);

      expect(userModel.findById).toHaveBeenCalledWith(id);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      userModel.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(userService.findUserById(notRegisteredId)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(userModel.findById).toHaveBeenCalledWith(notRegisteredId);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('findUser function', () => {
    it('should return user when found by email or username', async () => {
      const identifier1: IdentifierUserType = { email: userExampleFull.email };
      const identifier2: IdentifierUserType = {
        username: userExampleFull.username,
      };

      const mockUser1: User = { ...userExample };
      const mockUser2: User = { ...userExample };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);

      const user1 = await userService.findUser(identifier1);
      const user2 = await userService.findUser(identifier2);

      expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
        $or: [{ email: identifier1.email }, { username: identifier1.username }],
      });
      expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
        $or: [{ email: identifier2.email }, { username: identifier2.username }],
      });
      expect(query.lean).toHaveBeenCalledTimes(2);
      expect(queryAfterLean.exec).toHaveBeenCalledTimes(2);
      expect(user1).toEqual(mockUser1);
      expect(user2).toEqual(mockUser2);
    });

    it('should throw NotFoundException when user not found', async () => {
      const identifier: IdentifierUserType = { email: 'notRegisteredEmail' };

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      userModel.findOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      expect(userService.findUser(identifier)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: identifier.email }, { username: identifier.username }],
      });
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('resetUserPassword function', () => {
    it('should reset password and return updated user', async () => {
      const id = userExampleFull._id;
      const newHashedPassword = 'newHashedPassword';

      const mockUpdatedUser: User = {
        ...userExample,
        password: newHashedPassword,
      };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findByIdAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue({
        ...userExample,
        password: newHashedPassword,
      } as User);

      const updatedUser = await userService.resetUserPassword(
        id,
        newHashedPassword,
      );

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { password: newHashedPassword },
        {
          returnDocument: 'after',
        },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(updatedUser).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();
      const newHashedPassword = 'newHashedPassword';

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      userModel.findByIdAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(
        userService.resetUserPassword(notRegisteredId, newHashedPassword),
      ).rejects.toThrow(new NotFoundException(`User not found`));
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        notRegisteredId,
        { password: newHashedPassword },
        {
          returnDocument: 'after',
        },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('updateUserUsername function', () => {
    it('should return updated user', async () => {
      const id = userExampleFull._id;
      const newUsername = 'testUser2';

      const mockUpdatedUser: User = {
        ...userExample,
        username: newUsername,
      };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findByIdAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample, username: newUsername } as User);

      const updatedUser = await userService.updateUserUsername(id, newUsername);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { username: newUsername },
        {
          returnDocument: 'after',
        },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(updatedUser).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();
      const newUsername = 'testUser2';

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      userModel.findByIdAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(
        userService.updateUserUsername(notRegisteredId, newUsername),
      ).rejects.toThrow(new NotFoundException(`User not found`));
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        notRegisteredId,
        { username: newUsername },
        {
          returnDocument: 'after',
        },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('deleteUser function', () => {
    it('should return deleted user', async () => {
      const id = userExampleFull._id;

      const mockDeletedUser: User = { ...userExample };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findByIdAndDelete = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);

      const deletedUser = await userService.deleteUser(id);

      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(id);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(deletedUser).toEqual(mockDeletedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      userModel.findByIdAndDelete = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(userService.deleteUser(notRegisteredId)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(notRegisteredId);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('checkUserExist function', () => {
    it('should return true if user exists', async () => {
      const id = userExampleFull._id;

      const query = {} as Query<UserDocument, UserDocument>;

      userModel.exists = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue({ _id: id });

      const isExist = await userService.checkUserExist(id);

      expect(userModel.exists).toHaveBeenCalledWith({ _id: id });
      expect(query.exec).toHaveBeenCalled();
      expect(isExist).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;

      userModel.exists = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue(null);

      const isExist = await userService.checkUserExist(notRegisteredId);

      expect(userModel.exists).toHaveBeenCalledWith({ _id: notRegisteredId });
      expect(query.exec).toHaveBeenCalled();
      expect(isExist).toBe(false);
    });
  });

  describe('getUserPassword function', () => {
    it('should return user password', async () => {
      const id = userExampleFull._id;

      const mockUser = { password: userExampleFull.password };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ password: userExampleFull.password });

      const userPassword = await userService.getUserPassword(id);

      expect(userModel.findById).toHaveBeenCalledWith(id, 'password');
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(userPassword).toEqual(mockUser.password);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      userModel.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(
        userService.getUserPassword(notRegisteredId),
      ).rejects.toThrow(new NotFoundException(`User not found`));
      expect(userModel.findById).toHaveBeenCalledWith(
        notRegisteredId,
        'password',
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('verifyUserByEmail function', () => {
    it('should verify user by email', async () => {
      const email = userExampleFull.email;

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findOneAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue({ ...userExample });

      await userService.verifyUserByEmail(email);

      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email },
        {
          is_verified: true,
        },
        { returnDocument: 'after' },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      const email = 'not registered email';

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      userModel.findOneAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(userService.verifyUserByEmail(email)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { email },
        {
          is_verified: true,
        },
        { returnDocument: 'after' },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });
});
