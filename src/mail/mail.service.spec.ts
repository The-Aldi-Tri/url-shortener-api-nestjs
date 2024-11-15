import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Query, Types } from 'mongoose';
import { UserService } from '../user/user.service';
import { MailService } from './mail.service';
import { Otp, OtpDocument } from './schema/otp.schema';

describe('MailService', () => {
  let mailService: MailService;
  let mailerService: MailerService;
  let otpModel: Model<Otp>;
  let configService: ConfigService;
  let userService: UserService;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string): string => {
      const config: Record<string, string> = {
        CLIENT_VERIFICATION_URL: 'http://google.com',
        API_VERIFICATION_URL: 'http://google.com',
      };
      return config[key];
    }),
  };

  const mockOtpModel = {
    findOneAndReplace: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockUserService = {
    verifyUserByEmail: jest.fn(),
  };

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

    mailerService = module.get<MailerService>(MailerService);
    mailService = module.get<MailService>(MailService);
    otpModel = module.get<Model<Otp>>(getModelToken(Otp.name));
    configService = module.get<ConfigService>(ConfigService);
    userService = module.get<UserService>(UserService);
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

      expect(verificationCode).toBeGreaterThanOrEqual(100000);
      expect(verificationCode).toBeLessThan(1000000);
    });
  });

  describe('createOtp function', () => {
    it('should otp document', async () => {
      const email = 'email@example.com';
      const otp = 123456;

      const mockResult: Otp = {
        _id: new Types.ObjectId(),
        email,
        otp,
        createdAt: new Date(),
      };

      const query = {} as Query<OtpDocument, OtpDocument>;
      const queryAfterLean = {} as Query<Otp, OtpDocument>;

      otpModel.findOneAndReplace = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...mockResult } as Otp);

      const result = await mailService.createOtp(email, otp);

      expect(otpModel.findOneAndReplace).toHaveBeenCalledWith(
        { email },
        { email, otp, createdAt: Date.now() },
        { upsert: true, returnDocument: 'after' },
      );
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('sendMail function', () => {
    it('should send mail', async () => {
      const email = 'email@example.com';
      const username = 'user123';

      const mockOtp = 123456;

      mailService.generateVerificationCode = jest
        .fn()
        .mockReturnValueOnce(mockOtp);
      mailService.createOtp = jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        email,
        otp: mockOtp,
        createdAt: new Date(),
      });
      mailerService.sendMail = jest.fn().mockResolvedValue(undefined);

      await mailService.sendMail(email, username);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          username,
          otp: mockOtp,
          websiteVerificationLink: configService.getOrThrow<string>(
            'CLIENT_VERIFICATION_URL',
          ),
          directVerificationLink:
            configService.getOrThrow<string>('API_VERIFICATION_URL') +
            `?email=${email}&otp=${mockOtp}`,
        },
      });
      expect(mailService.generateVerificationCode).toHaveBeenCalled();
      expect(mailService.createOtp).toHaveBeenCalled();
    });

    it('should handle error when email sending fails', async () => {
      const email = 'test@example.com';
      const username = 'testUser';

      const mockOtp = 123456;
      const mockOtpDoc = {
        _id: new Types.ObjectId(),
        email,
        otp: mockOtp,
        createdAt: new Date(),
      };
      const query = {} as Query<OtpDocument, OtpDocument>;
      const queryAfterLean = {} as Query<Otp, OtpDocument>;

      mailService.generateVerificationCode = jest
        .fn()
        .mockReturnValueOnce(mockOtp);
      mailService.createOtp = jest.fn().mockResolvedValue(mockOtpDoc);
      mailerService.sendMail = jest
        .fn()
        .mockRejectedValue(new Error('Mailer error'));
      otpModel.deleteOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(undefined);

      await expect(mailService.sendMail(email, username)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        from: 'noreply@aldi-dev.online',
        subject: 'E-mail verification',
        template: 'emailVerification',
        context: {
          username,
          otp: mockOtp,
          websiteVerificationLink: configService.getOrThrow<string>(
            'CLIENT_VERIFICATION_URL',
          ),
          directVerificationLink:
            configService.getOrThrow<string>('API_VERIFICATION_URL') +
            `?email=${email}&otp=${mockOtp}`,
        },
      });
      expect(otpModel.deleteOne).toHaveBeenCalledWith({ email });
      expect(mailService.generateVerificationCode).toHaveBeenCalled();
      expect(mailService.createOtp).toHaveBeenCalled();
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with correct OTP', async () => {
      const email = 'test@example.com';
      const otp = 123456;

      const mockOtpDoc = { _id: new Types.ObjectId() };
      const query = {} as Query<OtpDocument, OtpDocument>;
      const queryAfterLean = {} as Query<Otp, OtpDocument>;

      otpModel.exists = jest.fn().mockResolvedValue(mockOtpDoc);

      otpModel.deleteOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(undefined);

      mockUserService.verifyUserByEmail.mockResolvedValue(undefined);

      await mailService.verifyEmail(email, otp);

      expect(userService.verifyUserByEmail).toHaveBeenCalledWith(email);
      expect(otpModel.deleteOne).toHaveBeenCalledWith({ _id: mockOtpDoc._id });
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      const email = 'test@example.com';
      const otp = 123456;

      otpModel.exists = jest.fn().mockResolvedValue(null);

      await expect(mailService.verifyEmail(email, otp)).rejects.toThrow(
        new BadRequestException('Verification failed'),
      );
    });
  });
});
