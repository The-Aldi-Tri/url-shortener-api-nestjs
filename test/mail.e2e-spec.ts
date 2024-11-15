import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Otp } from '../src/mail/schema/otp.schema';
import { User } from '../src/user/schema/user.schema';

describe('Mail routes (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let otpModel: Model<Otp>;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    otpModel = moduleFixture.get<Model<Otp>>(getModelToken(Otp.name));
    authService = moduleFixture.get<AuthService>(AuthService);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    await otpModel.deleteMany({});
    await app.close();
  });

  describe('POST /mail/send', () => {
    it('should return 200', async () => {
      const requestBody = {
        email: 'User@example.com',
        username: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/mail/send')
        .send({ ...requestBody });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'Verification mail sent',
        }),
      );
    });
  });

  describe('GET /mail/verify', () => {
    it('should return 200', async () => {
      const user = await userModel.create({
        email: 'User14@example.com',
        username: 'User14',
        password: await authService.hash('StrongPa5$14'),
        is_verified: false,
      });
      const otpDoc = await otpModel.create({ email: user.email, otp: 123456 });

      const response = await request(app.getHttpServer())
        .get('/mail/verify')
        .query({ email: user.email, otp: otpDoc.otp.toString() })
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'Verification success',
        }),
      );
    });
  });
});
