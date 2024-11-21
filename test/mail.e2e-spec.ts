import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Verification } from '../src/mail/schema/verification.schema';
import { User } from '../src/user/schema/user.schema';
import { createUserRecord } from './utils/createUserRecord';
import { faker } from './utils/faker';

describe('Mail routes (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let verificationModel: Model<Verification>;
  let authService: AuthService;

  beforeAll(() => {
    faker.seed(104);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    verificationModel = moduleFixture.get<Model<Verification>>(
      getModelToken(Verification.name),
    );
    authService = moduleFixture.get<AuthService>(AuthService);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    await verificationModel.deleteMany({});
    await app.close();
  });

  describe('POST /mail/send', () => {
    it('should return 200', async () => {
      const { user } = await createUserRecord(userModel, authService, false);
      const requestBody = { email: user.email };

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
      const verificationCode = faker.number.int({ min: 100000, max: 999999 });
      const { user } = await createUserRecord(userModel, authService, false);
      await verificationModel.create({ email: user.email, verificationCode });
      const requestBody = { email: user.email, verificationCode };

      const response = await request(app.getHttpServer())
        .post('/mail/verify')
        .send({ ...requestBody });

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
