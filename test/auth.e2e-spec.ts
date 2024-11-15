import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import * as request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/user/schema/user.schema';
import { AppModule } from './../src/app.module';

describe('Auth routes (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let authService: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    authService = moduleFixture.get<AuthService>(AuthService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should return 201 when signup successful', async () => {
      const requestBody = {
        username: 'User1',
        email: 'User1@example.com',
        password: 'StrongPa5$1',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...requestBody });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 201,
          message: 'User successfully created',
          data: expect.objectContaining({
            _id: expect.any(String),
            email: requestBody.email,
            username: requestBody.username,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            is_verified: false,
          }),
        }),
      );
      expect(Types.ObjectId.isValid(response.body.data._id)).toBe(true);
      expect(Date.parse(response.body.data.createdAt)).toBeTruthy();
      expect(Date.parse(response.body.data.updatedAt)).toBeTruthy();
    });

    it('should return 422 when request body not valid', async () => {
      const requestBody = {};

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...requestBody });

      expect(response.status).toBe(422);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: expect.arrayContaining([expect.any(String)]),
        }),
      );
      expect(response.body.message.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 409 when user already exists', async () => {
      const requestBody = {
        username: 'User2',
        email: 'User2@example.com',
        password: 'StrongPa5$2',
      };

      await authService.signup({ ...requestBody });
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...requestBody });

      expect(response.status).toBe(409);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 409,
          error: 'Duplicate data',
          message: expect.any(String),
        }),
      );
      expect(response.body.message).toMatch(
        /This (username|email) is already in use/,
      );
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 and tokens when user exists and password matches', async () => {
      const user = await userModel.create({
        email: 'User3@example.com',
        password: await authService.hash('StrongPa5$3'),
        username: 'User3',
        is_verified: true,
      });
      const requestBody = {
        username: user.username,
        password: 'StrongPa5$3',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...requestBody });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'Login success',
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        }),
      );
      expect(() =>
        jwtService.verify(response.body.data.accessToken, {
          secret: configService.getOrThrow<string>('JWT_SECRET_ACCESS_TOKEN'),
        }),
      ).not.toThrow(JsonWebTokenError);
      expect(() =>
        jwtService.verify(response.body.data.refreshToken, {
          secret: configService.getOrThrow<string>('JWT_SECRET_REFRESH_TOKEN'),
        }),
      ).not.toThrow(JsonWebTokenError);
    });

    it('should return 404 when user not found', async () => {
      const requestBody = {
        email: 'User4@example.com',
        password: 'StrongPa5$4',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...requestBody });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        }),
      );
    });

    it('should return 400 when password is incorrect', async () => {
      const user = await userModel.create({
        email: 'User5@example.com',
        username: 'User5',
        password: await authService.hash('StrongPa5$5'),
        is_verified: true,
      });
      const requestBody = {
        email: user.email,
        password: 'wrongPa5$',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...requestBody });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Password is incorrect',
        }),
      );
    });

    it('should return 400 when user not verified', async () => {
      const user = await userModel.create({
        email: 'User5@example.com',
        username: 'User5',
        password: await authService.hash('StrongPa5$5'),
        is_verified: false,
      });
      const requestBody = {
        email: user.email,
        password: 'StrongPa5$5',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...requestBody });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Please verify your email before logging in.',
        }),
      );
    });
  });

  describe('GET /auth/refresh', () => {
    it('should return 200 and refreshed token when user is authenticated', async () => {
      const user = await userModel.create({
        email: 'User6@example.com',
        username: 'User6',
        password: await authService.hash('StrongPa5$6'),
        is_verified: true,
      });
      const refreshToken = authService.generateRefreshToken({ sub: user._id });

      const response = await request(app.getHttpServer())
        .get('/auth/refresh')
        .set('Authorization', 'Bearer ' + refreshToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'Refresh token success',
          data: { accessToken: expect.any(String) },
        }),
      );
      expect(() =>
        jwtService.verify(refreshToken, {
          secret: configService.getOrThrow<string>('JWT_SECRET_REFRESH_TOKEN'),
        }),
      ).not.toThrow(JsonWebTokenError);
    });

    it('should return 401 when refresh token is invalid', async () => {
      await userModel.create({
        email: 'User7@example.com',
        username: 'User7',
        password: await authService.hash('StrongPa5$7'),
        is_verified: true,
      });
      const refreshToken = 'invalid token';

      const response = await request(app.getHttpServer())
        .get('/auth/refresh')
        .set('Authorization', 'Bearer ' + refreshToken)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should return 200 when change password success', async () => {
      const user = await userModel.create({
        email: 'User8@example.com',
        username: 'User8',
        password: await authService.hash('StrongPa5$8'),
        is_verified: true,
      });
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const requestBody = {
        password: 'StrongPa5$8',
        newPassword: 'StrongPa5$8' + 'v2',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'Password successfully changed',
        }),
      );
    });

    it('should return 400 when password incorrect', async () => {
      const user = await userModel.create({
        email: 'User9@example.com',
        username: 'User9',
        password: await authService.hash('StrongPa5$9'),
        is_verified: true,
      });
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const requestBody = {
        password: 'WrongStrongPa5$9',
        newPassword: user.password + 'v2',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Password is incorrect',
        }),
      );
    });

    it('should return 422 when password and new password are the same', async () => {
      const user = await userModel.create({
        email: 'User10@example.com',
        username: 'User10',
        password: await authService.hash('StrongPa5$10'),
        is_verified: true,
      });
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const requestBody = {
        password: user.password,
        newPassword: user.password,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(422);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: ['New password must be different from previous'],
        }),
      );
    });
  });
});
