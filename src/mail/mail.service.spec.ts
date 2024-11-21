import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ClsService } from 'nestjs-cls';
import { faker } from '../../test/utils/faker';
import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { MailService } from './mail.service';
import { Verification } from './schema/verification.schema';

describe('MailService', () => {
  let mailService: MailService;

  const mockConfigService = {
    getOrThrow<T = string>(key: string): T {
      const config: Record<string, string> = {
        CLIENT_VERIFICATION_URL: 'http://google.com/',
        DIRECT_VERIFICATION_URL: 'http://google.com',
      };
      return config[key] as T;
    },
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockVerificationModel = {
    findOneAndReplace: jest.fn(),
    deleteOne: jest.fn(),
    exists: jest.fn(),
  };

  const mockUserService = {
    findUser: jest.fn(),
    findUserById: jest.fn(),
    verifyUserByEmail: jest.fn(),
  };

  const mockClsService = {
    get: jest.fn(),
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
    faker.seed(7);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailerService, useValue: mockMailerService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getModelToken(Verification.name),
          useValue: mockVerificationModel,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: ClsService, useValue: mockClsService },
      ],
    }).compile();

    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(mailService).toBeDefined();
  });

  describe('generateVerificationCode function', () => {
    it('should generate 6 digit number', () => {
      const verificationCode = mailService.generateVerificationCode();

      expect(Number.isInteger(verificationCode)).toBe(true);
      expect(verificationCode).toBeGreaterThanOrEqual(100000);
      expect(verificationCode).toBeLessThan(1000000);
    });
  });

  describe('createVerificationRecord function', () => {
    it('should create verification record/document', async () => {
      const email = faker.internet.email();
      const verificationCode = faker.number.int({ min: 100000, max: 999999 });

      const mockNewVerification: Partial<Verification> = {
        _id: new Types.ObjectId(faker.database.mongodbObjectId()),
        email,
        verificationCode,
        createdAt: faker.date.recent(),
      };

      mockVerificationModel.findOneAndReplace.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockNewVerification }),
        }),
      });

      const newVerification = await mailService.createVerificationRecord(
        email,
        verificationCode,
      );

      expect(mockVerificationModel.findOneAndReplace).toHaveBeenCalledWith(
        { email },
        { email, verificationCode, createdAt: expect.any(Number) },
        { upsert: true, returnDocument: 'after' },
      );
      expect(newVerification).toEqual(mockNewVerification);
    });
  });

  describe('sendMail function', () => {
    it('should send mail', async () => {
      const email = faker.internet.email();

      const user = generateUser(false);
      user.email = email;

      const verificationCode = faker.number.int({ min: 100000, max: 999999 });

      mockUserService.findUser.mockResolvedValue({ ...user });
      jest
        .spyOn(mailService, 'generateVerificationCode')
        .mockReturnValueOnce(verificationCode);
      jest
        .spyOn(mailService, 'createVerificationRecord')
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(faker.database.mongodbObjectId()),
          email,
          verificationCode,
          createdAt: faker.date.recent(),
        });
      mockMailerService.sendMail = jest.fn().mockResolvedValue(undefined);

      await mailService.sendMail(email);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          email: user.email,
          username: user.username,
          verificationCode,
          websiteVerificationLink:
            mockConfigService.getOrThrow<string>('CLIENT_VERIFICATION_URL') +
            user._id,
          directVerificationLink:
            mockConfigService.getOrThrow<string>('DIRECT_VERIFICATION_URL') +
            `?userId=${user._id}&verificationCode=${verificationCode}`,
        },
      });
      expect(mailService.generateVerificationCode).toHaveBeenCalled();
      expect(mailService.createVerificationRecord).toHaveBeenCalled();
    });

    it('should throw ConflictException for already verified account', async () => {
      const email = faker.internet.email();

      const user = generateUser();
      user.email = email;

      mockUserService.findUser.mockResolvedValue({ ...user });

      await expect(mailService.sendMail(email)).rejects.toThrow(
        new ConflictException('Account already verified'),
      );
      expect(mockUserService.findUser).toHaveBeenCalledWith({ email });
    });

    it('should handle error when email sending fails', async () => {
      const email = faker.internet.email();

      const user = generateUser(false);
      user.email = email;

      const verificationCode = faker.number.int({ min: 100000, max: 999999 });

      mockUserService.findUser.mockResolvedValue({ ...user });
      jest
        .spyOn(mailService, 'generateVerificationCode')
        .mockReturnValueOnce(verificationCode);
      jest
        .spyOn(mailService, 'createVerificationRecord')
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(faker.database.mongodbObjectId()),
          email,
          verificationCode,
          createdAt: faker.date.recent(),
        });
      mockMailerService.sendMail = jest
        .fn()
        .mockRejectedValueOnce(new Error('Mailer error'));
      mockVerificationModel.deleteOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await expect(mailService.sendMail(email)).rejects.toThrow(
        new InternalServerErrorException(),
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          email: user.email,
          username: user.username,
          verificationCode,
          websiteVerificationLink:
            mockConfigService.getOrThrow<string>('CLIENT_VERIFICATION_URL') +
            user._id,
          directVerificationLink:
            mockConfigService.getOrThrow<string>('DIRECT_VERIFICATION_URL') +
            `?userId=${user._id}&verificationCode=${verificationCode}`,
        },
      });
      expect(mailService.generateVerificationCode).toHaveBeenCalled();
      expect(mailService.createVerificationRecord).toHaveBeenCalled();
      expect(mockVerificationModel.deleteOne).toHaveBeenCalled();
    });
  });

  describe('verifyAccount', () => {
    it('should verify account by email', async () => {
      const email = faker.internet.email();

      const user = generateUser(false);
      user.email = email;

      const verificationCode = faker.number.int({ min: 100000, max: 999999 });

      const verificationRecord = {
        _id: new Types.ObjectId(faker.database.mongodbObjectId()),
      };

      mockUserService.findUser.mockResolvedValue({ ...user });
      mockVerificationModel.exists.mockResolvedValue({ ...verificationRecord });
      mockUserService.verifyUserByEmail.mockResolvedValue(undefined);
      mockVerificationModel.deleteOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await mailService.verifyAccount({
        email,
        userId: undefined,
        verificationCode,
      });

      expect(mockUserService.findUser).toHaveBeenCalledWith({ email });
      expect(mockVerificationModel.exists).toHaveBeenCalledWith({
        email,
        verificationCode,
      });
      expect(mockUserService.verifyUserByEmail).toHaveBeenCalledWith(email);
      expect(mockVerificationModel.deleteOne).toHaveBeenCalledWith(
        verificationRecord,
      );
    });

    it('should verify account by user ID', async () => {
      const user = generateUser(false);
      const userId = user._id;

      const verificationCode = faker.number.int({ min: 100000, max: 999999 });

      const verificationRecord = {
        _id: new Types.ObjectId(faker.database.mongodbObjectId()),
      };

      mockUserService.findUserById.mockResolvedValue({ ...user });
      mockVerificationModel.exists.mockResolvedValue({ ...verificationRecord });
      mockUserService.verifyUserByEmail.mockResolvedValue(undefined);
      mockVerificationModel.deleteOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await mailService.verifyAccount({
        email: undefined,
        userId,
        verificationCode,
      });

      expect(mockUserService.findUserById).toHaveBeenCalledWith(userId);
      expect(mockVerificationModel.exists).toHaveBeenCalledWith({
        email: user.email,
        verificationCode,
      });
      expect(mockUserService.verifyUserByEmail).toHaveBeenCalledWith(
        user.email,
      );
      expect(mockVerificationModel.deleteOne).toHaveBeenCalledWith(
        verificationRecord,
      );
    });

    it('should throw ConflictException for already verified account', async () => {
      const email = faker.internet.email();

      const user = generateUser();
      user.email = email;

      const verificationCode = faker.number.int({ min: 100000, max: 999999 });

      mockUserService.findUser.mockResolvedValue({ ...user });

      await expect(
        mailService.verifyAccount({
          email,
          userId: undefined,
          verificationCode,
        }),
      ).rejects.toThrow(new ConflictException('Account already verified'));
      expect(mockUserService.findUser).toHaveBeenCalledWith({ email });
    });

    it('should throw BadRequestException for invalid code', async () => {
      const email = faker.internet.email();

      const user = generateUser(false);
      user.email = email;

      const verificationCode = faker.number.int({ min: 100000, max: 999999 });

      mockUserService.findUser.mockResolvedValue({ ...user });
      mockVerificationModel.exists.mockResolvedValue(null);

      await expect(
        mailService.verifyAccount({
          email,
          userId: undefined,
          verificationCode,
        }),
      ).rejects.toThrow(new BadRequestException('Invalid verification code'));
      expect(mockUserService.findUser).toHaveBeenCalledWith({ email });
      expect(mockVerificationModel.exists).toHaveBeenCalledWith({
        email,
        verificationCode,
      });
    });
  });
});
