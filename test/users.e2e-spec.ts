import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import * as request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/user/schema/user.schema';
import { AppModule } from './../src/app.module';
import { createUserRecord } from './utils/createUserRecord';
import { faker } from './utils/faker';

describe('Users routes (e2e)', () => {
  let seed = 0;

  let app: INestApplication;
  let userModel: Model<User>;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    authService = moduleFixture.get<AuthService>(AuthService);

    app = moduleFixture.createNestApplication();
    await app.init();

    seed++;
    faker.seed(seed);
  });

  afterEach(async () => {
    faker.seed();
    await userModel.deleteMany({});
    await app.close();
  });

  describe('GET /users', () => {
    it('should return 200 and user', async () => {
      const { user } = await createUserRecord(userModel, authService);
      const accessToken = authService.generateAccessToken({ sub: user._id });

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer ' + accessToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'User successfully retrieved',
          data: expect.objectContaining({
            _id: expect.any(String),
            email: user.email,
            username: user.username,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            is_verified: true,
          }),
        }),
      );
      expect(Types.ObjectId.isValid(response.body.data._id)).toBe(true);
      expect(Date.parse(response.body.data.createdAt)).toBeTruthy();
      expect(Date.parse(response.body.data.updatedAt)).toBeTruthy();
    });
  });

  describe('PATCH /users', () => {
    it('should return 200 and updated user', async () => {
      const { user } = await createUserRecord(userModel, authService);
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const requestBody = {
        username: faker.internet.username() + 'v2',
      };

      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'User successfully updated',
          data: expect.objectContaining({
            _id: expect.any(String),
            email: user.email,
            username: requestBody.username,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            is_verified: true,
          }),
        }),
      );
      expect(Types.ObjectId.isValid(response.body.data._id)).toBe(true);
      expect(Date.parse(response.body.data.createdAt)).toBeTruthy();
      expect(Date.parse(response.body.data.updatedAt)).toBeTruthy();
      expect(Date.parse(response.body.data.updatedAt)).toBeGreaterThan(
        Date.parse(response.body.data.createdAt),
      );
    });
  });

  describe('DELETE /users', () => {
    it('should return 200 and deleted user', async () => {
      const { user } = await createUserRecord(userModel, authService);
      const accessToken = authService.generateAccessToken({ sub: user._id });

      const response = await request(app.getHttpServer())
        .delete('/users')
        .set('Authorization', 'Bearer ' + accessToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'User successfully deleted',
          data: expect.objectContaining({
            _id: expect.any(String),
            email: user.email,
            username: user.username,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            is_verified: true,
          }),
        }),
      );
      expect(Types.ObjectId.isValid(response.body.data._id)).toBe(true);
      expect(Date.parse(response.body.data.createdAt)).toBeTruthy();
      expect(Date.parse(response.body.data.updatedAt)).toBeTruthy();
    });
  });
});
