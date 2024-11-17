import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { faker } from '../../test/utils/faker';
import { UserService } from '../user/user.service';
import { MailService } from './mail.service';
import { Otp, OtpDocument } from './schema/otp.schema';

describe('MailService', () => {
  let mailService: MailService;

  const mockConfigService = {
    getOrThrow<T = string>(key: string): T {
      const config: Record<string, string> = {
        CLIENT_VERIFICATION_URL: 'http://google.com',
        API_VERIFICATION_URL: 'http://google.com',
      };
      return config[key] as T;
    },
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockOtpModel = {
    findOneAndReplace: jest.fn(),
    exists: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockUserService = {
    verifyUserByEmail: jest.fn(),
  };

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
          provide: getModelToken(Otp.name),
          useValue: mockOtpModel,
        },
        { provide: UserService, useValue: mockUserService },
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

  describe('createOtp function', () => {
    it('should otp document', async () => {
      const email = faker.internet.email();
      const otp = faker.number.int({ min: 100000, max: 999999 });

      const mockNewOtp: Partial<Otp> = {
        _id: new Types.ObjectId(faker.database.mongodbObjectId()),
        email,
        otp,
        createdAt: faker.date.recent(),
      };

      mockOtpModel.findOneAndReplace.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockNewOtp }),
        }),
      });

      const newOtp = await mailService.createOtp(email, otp);

      expect(mockOtpModel.findOneAndReplace).toHaveBeenCalledWith(
        { email },
        { email, otp, createdAt: expect.any(Number) },
        { upsert: true, returnDocument: 'after' },
      );
      expect(newOtp).toEqual(mockNewOtp);
    });
  });

  describe('sendMail function', () => {
    it('should send mail', async () => {
      const email = faker.internet.email();
      const username = faker.internet.username();

      const mockOtp = faker.number.int({ min: 100000, max: 999999 });

      jest
        .spyOn(mailService, 'generateVerificationCode')
        .mockReturnValueOnce(mockOtp);
      jest.spyOn(mailService, 'createOtp').mockResolvedValueOnce({
        _id: new Types.ObjectId(faker.database.mongodbObjectId()),
        email,
        otp: mockOtp,
        createdAt: faker.date.recent(),
      });
      mockMailerService.sendMail = jest.fn().mockResolvedValue(undefined);

      await mailService.sendMail(email, username);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          username,
          otp: mockOtp,
          websiteVerificationLink: mockConfigService.getOrThrow<string>(
            'CLIENT_VERIFICATION_URL',
          ),
          directVerificationLink:
            mockConfigService.getOrThrow<string>('API_VERIFICATION_URL') +
            `?email=${email}&otp=${mockOtp}`,
        },
      });
      expect(mailService.generateVerificationCode).toHaveBeenCalled();
      expect(mailService.createOtp).toHaveBeenCalled();
    });

    it('should handle error when email sending fails', async () => {
      const email = faker.internet.email();
      const username = faker.internet.username();

      const mockOtp = faker.number.int({ min: 100000, max: 999999 });

      jest
        .spyOn(mailService, 'generateVerificationCode')
        .mockReturnValueOnce(mockOtp);
      jest.spyOn(mailService, 'createOtp').mockResolvedValueOnce({
        _id: new Types.ObjectId(faker.database.mongodbObjectId()),
        email,
        otp: mockOtp,
        createdAt: faker.date.recent(),
      });
      mockMailerService.sendMail = jest
        .fn()
        .mockRejectedValueOnce(new Error('Mailer error'));
      mockOtpModel.deleteOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await expect(mailService.sendMail(email, username)).rejects.toThrow(
        new InternalServerErrorException(),
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          username,
          otp: mockOtp,
          websiteVerificationLink: mockConfigService.getOrThrow<string>(
            'CLIENT_VERIFICATION_URL',
          ),
          directVerificationLink:
            mockConfigService.getOrThrow<string>('API_VERIFICATION_URL') +
            `?email=${email}&otp=${mockOtp}`,
        },
      });
      expect(mailService.generateVerificationCode).toHaveBeenCalled();
      expect(mailService.createOtp).toHaveBeenCalled();
      expect(mockOtpModel.deleteOne).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with correct OTP', async () => {
      const email = faker.internet.email();
      const otp = faker.number.int({ min: 100000, max: 999999 });

      const otpDoc = {
        _id: new Types.ObjectId(faker.database.mongodbObjectId()),
      } as OtpDocument;

      mockOtpModel.exists.mockResolvedValue(otpDoc);
      mockUserService.verifyUserByEmail.mockResolvedValue(undefined);
      mockOtpModel.deleteOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await mailService.verifyEmail(email, otp);

      expect(mockOtpModel.exists).toHaveBeenCalledWith({ email, otp });
      expect(mockUserService.verifyUserByEmail).toHaveBeenCalledWith(email);
      expect(mockOtpModel.deleteOne).toHaveBeenCalledWith({ _id: otpDoc._id });
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      const email = faker.internet.email();
      const otp = faker.number.int({ min: 100000, max: 999999 });

      mockOtpModel.exists.mockResolvedValue(null);

      await expect(mailService.verifyEmail(email, otp)).rejects.toThrow(
        new BadRequestException('Verification failed'),
      );
    });
  });
});
