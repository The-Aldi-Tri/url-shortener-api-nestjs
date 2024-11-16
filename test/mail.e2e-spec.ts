import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Otp } from '../src/mail/schema/otp.schema';
import { User } from '../src/user/schema/user.schema';
import { createUserRecord } from './utils/createUserRecord';
import { faker } from './utils/faker';

describe('Mail routes (e2e)', () => {
  let seed = 300;
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

    seed++;
    faker.seed(seed);
  });

  afterEach(async () => {
    faker.seed();
    await userModel.deleteMany({});
    await otpModel.deleteMany({});
    await app.close();
  });

  describe('POST /mail/send', () => {
    it('should return 200', async () => {
      const requestBody = {
        email: faker.internet.email(),
        username: faker.internet.username(),
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
      const { user } = await createUserRecord(userModel, authService, false);
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
