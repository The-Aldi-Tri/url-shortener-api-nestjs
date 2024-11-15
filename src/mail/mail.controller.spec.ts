import { Test, TestingModule } from '@nestjs/testing';
import { SendMailDto } from './dto/send-mail.dto';
import { VerifyMailDto } from './dto/verify-mail.dto';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

describe('MailController', () => {
  let mailController: MailController;
  let mailService: MailService;

  const mockMailService = {
    generateVerificationCode: jest.fn(),
    createOtp: jest.fn(),
    sendMail: jest.fn(),
    verifyEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [{ provide: MailService, useValue: mockMailService }],
    }).compile();

    mailController = module.get<MailController>(MailController);
    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(mailController).toBeDefined();
  });

  describe('send', () => {
    it('should send a verification email successfully', async () => {
      const sendMailDto: SendMailDto = {
        email: 'test@example.com',
        username: 'testUser',
      };
      mockMailService.sendMail.mockResolvedValue(undefined);

      const result = await mailController.send(sendMailDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Verification mail sent',
      });
      expect(mailService.sendMail).toHaveBeenCalledWith(
        sendMailDto.email,
        sendMailDto.username,
      );
    });
  });

  describe('verify', () => {
    it('should verify email with correct OTP successfully', async () => {
      const verifyMailDto: VerifyMailDto = {
        email: 'test@example.com',
        otp: 123456,
      };
      mockMailService.verifyEmail.mockResolvedValue(undefined);

      const result = await mailController.verify(verifyMailDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Verification success',
      });
      expect(mailService.verifyEmail).toHaveBeenCalledWith(
        verifyMailDto.email,
        verifyMailDto.otp,
      );
    });
  });
});
