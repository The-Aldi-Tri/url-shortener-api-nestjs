import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '../../test/utils/faker';
import { SendMailDto } from './dto/send-mail.dto';
import { VerifyMailDto } from './dto/verify-mail.dto';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

describe('MailController', () => {
  let mailController: MailController;

  const mockMailService = {
    sendMail: jest.fn(),
    verifyEmail: jest.fn(),
  };

  beforeAll(() => {
    faker.seed(7);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [{ provide: MailService, useValue: mockMailService }],
    }).compile();

    mailController = module.get<MailController>(MailController);
  });

  it('should be defined', () => {
    expect(mailController).toBeDefined();
  });

  describe('send', () => {
    it('should send a verification email successfully', async () => {
      const sendMailDto: SendMailDto = {
        email: faker.internet.email(),
        username: faker.internet.username(),
      };
      mockMailService.sendMail.mockResolvedValue(undefined);

      const result = await mailController.send(sendMailDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Verification mail sent',
      });
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        sendMailDto.email,
        sendMailDto.username,
      );
    });
  });

  describe('verify', () => {
    it('should verify email with correct OTP successfully', async () => {
      const verifyMailDto: VerifyMailDto = {
        email: faker.internet.email(),
        otp: faker.number.int({ min: 100000, max: 999999 }),
      };
      mockMailService.verifyEmail.mockResolvedValue(undefined);

      const result = await mailController.verify(verifyMailDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Verification success',
      });
      expect(mockMailService.verifyEmail).toHaveBeenCalledWith(
        verifyMailDto.email,
        verifyMailDto.otp,
      );
    });
  });
});
