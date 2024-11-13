import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Query, Types } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { CreateUserType } from './type/CreateUser.type';
import { IdentifierUserType } from './type/IdentifierUser.type';
import { UpdateUserType } from './type/UpdateUser.type';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let model: Model<User>;

  const mockUserModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    exists: jest.fn(),
  };

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

    service = module.get<UserService>(UserService);
    model = module.get<Model<User>>(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create function', () => {
    it('should create a new user and return it without password and __v', async () => {
      const userData: CreateUserType = {
        email: userExampleFull.email,
        username: userExampleFull.username,
        password: userExampleFull.password,
      };

      const mockUserDoc = {
        ...userExample,
      } as UserDocument;

      const mockAddedUser: User = {
        ...userExample,
      };

      model.create = jest.fn().mockResolvedValue(mockUserDoc);
      mockUserDoc.toObject = jest.fn().mockReturnValue({ ...userExample });

      const addedUser = await service.create(userData);

      expect(model.create).toHaveBeenCalledWith(userData);
      expect(mockUserDoc.toObject).toHaveBeenCalled();
      expect(addedUser).toEqual(mockAddedUser);
    });
  });

  describe('findById function', () => {
    it('should return user when found', async () => {
      const id = userExampleFull._id;

      const mockUser: User = { ...userExample };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      model.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);

      const user = await service.findById(id);

      expect(model.findById).toHaveBeenCalledWith(id);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      model.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(service.findById(notRegisteredId)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(model.findById).toHaveBeenCalledWith(notRegisteredId);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('findOne function', () => {
    it('should return user when found by email or username', async () => {
      const identifier1: IdentifierUserType = { email: userExampleFull.email };
      const identifier2: IdentifierUserType = {
        username: userExampleFull.username,
      };

      const mockUser1: User = { ...userExample };
      const mockUser2: User = { ...userExample };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      model.findOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);

      const user1 = await service.findOne(identifier1);
      const user2 = await service.findOne(identifier2);

      expect(model.findOne).toHaveBeenNthCalledWith(1, {
        $or: [{ email: identifier1.email }, { username: identifier1.username }],
      });
      expect(model.findOne).toHaveBeenNthCalledWith(2, {
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

      model.findOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      expect(service.findOne(identifier)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(model.findOne).toHaveBeenCalledWith({
        $or: [{ email: identifier.email }, { username: identifier.username }],
      });
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('updateById function', () => {
    it('should return updated user', async () => {
      const id = userExampleFull._id;
      const updateUserData: UpdateUserType = {
        username: 'testUser2',
        email: 'test2@example.com',
      };

      const mockUpdatedUser: User = {
        ...userExample,
        ...updateUserData,
      };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      model.findByIdAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample, ...updateUserData } as User);

      const updatedUser = await service.updateById(id, updateUserData);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(id, updateUserData, {
        returnDocument: 'after',
      });
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(updatedUser).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();
      const updateUserData: UpdateUserType = {
        username: 'testUser2',
        email: 'test2@example.com',
      };

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      model.findByIdAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateById(notRegisteredId, updateUserData),
      ).rejects.toThrow(new NotFoundException(`User not found`));
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        notRegisteredId,
        updateUserData,
        {
          returnDocument: 'after',
        },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('removeById function', () => {
    it('should return deleted user', async () => {
      const id = userExampleFull._id;

      const mockDeletedUser: User = { ...userExample };

      const query = {} as Query<UserDocument, UserDocument>;
      const queryAfterLean = {} as Query<User, UserDocument>;

      model.findByIdAndDelete = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);

      const deletedUser = await service.removeById(id);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(id);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(deletedUser).toEqual(mockDeletedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      model.findByIdAndDelete = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(service.removeById(notRegisteredId)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(model.findByIdAndDelete).toHaveBeenCalledWith(notRegisteredId);
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('checkUserExist function', () => {
    it('should return true if user exists', async () => {
      const id = userExampleFull._id;

      const query = {} as Query<UserDocument, UserDocument>;

      model.exists = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue({ _id: id });

      const isExist = await service.checkUserExist(id);

      expect(model.exists).toHaveBeenCalledWith({ _id: id });
      expect(query.exec).toHaveBeenCalled();
      expect(isExist).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;

      model.exists = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue(null);

      const isExist = await service.checkUserExist(notRegisteredId);

      expect(model.exists).toHaveBeenCalledWith({ _id: notRegisteredId });
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

      model.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ password: userExampleFull.password });

      const userPassword = await service.getUserPassword(id);

      expect(model.findById).toHaveBeenCalledWith(id, 'password');
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(userPassword).toEqual(mockUser.password);
    });

    it('should throw NotFoundException when user not found', async () => {
      const notRegisteredId = new Types.ObjectId();

      const query = {} as Query<null, UserDocument>;
      const queryAfterLean = {} as Query<null, null>;

      model.findById = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(service.getUserPassword(notRegisteredId)).rejects.toThrow(
        new NotFoundException(`User not found`),
      );
      expect(model.findById).toHaveBeenCalledWith(notRegisteredId, 'password');
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });
});
