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
    verifyAccount: jest.fn(),
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
      const sendMailDto: SendMailDto = { email: faker.internet.email() };
      mockMailService.sendMail.mockResolvedValue(undefined);

      const result = await mailController.send(sendMailDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Verification mail sent',
      });
      expect(mockMailService.sendMail).toHaveBeenCalledWith(sendMailDto.email);
    });
  });

  describe('verify', () => {
    it('should verify email with correct code successfully', async () => {
      const verifyMailDto: VerifyMailDto = {
        email: faker.internet.email(),
        verificationCode: faker.number.int({ min: 100000, max: 999999 }),
      };
      mockMailService.verifyAccount.mockResolvedValue(undefined);

      const result = await mailController.verify(verifyMailDto);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Verification success',
      });
      expect(mockMailService.verifyAccount).toHaveBeenCalledWith({
        email: verifyMailDto.email,
        userId: undefined,
        verificationCode: verifyMailDto.verificationCode,
      });
    });
  });
});
