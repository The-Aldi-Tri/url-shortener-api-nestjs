import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { DeleteUrlDto } from 'src/url/dto/delete-url.dto';
import * as request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { Url } from '../src/url/schema/url.schema';
import { UrlService } from '../src/url/url.service';
import { User } from '../src/user/schema/user.schema';
import { AppModule } from './../src/app.module';

describe('Urls routes (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let urlModel: Model<Url>;
  let authService: AuthService;
  let urlService: UrlService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    urlModel = moduleFixture.get<Model<Url>>(getModelToken(Url.name));
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    urlService = moduleFixture.get<UrlService>(UrlService);
    authService = moduleFixture.get<AuthService>(AuthService);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await urlModel.deleteMany({});
    await userModel.deleteMany({});
    await app.close();
  });

  describe('POST /urls', () => {
    it('should return 200 and created url', async () => {
      const user = {
        email: 'User14@example.com',
        password: 'StrongPa5$14',
        username: 'User14',
      };
      await authService.signup({ ...user });
      const { accessToken } = await authService.login({
        username: user.username,
        password: user.password,
      });
      const requestBody = {
        origin: 'https://google.com',
        shorten: 'abc123',
      };

      const response = await request(app.getHttpServer())
        .post('/urls')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Url successfully created',
          data: expect.objectContaining({
            _id: expect.any(String),
            shorten: requestBody.shorten,
            origin: requestBody.origin,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        }),
      );
      expect(Types.ObjectId.isValid(response.body.data._id)).toBe(true);
      expect(Date.parse(response.body.data.createdAt)).toBeTruthy();
      expect(Date.parse(response.body.data.updatedAt)).toBeTruthy();
    });
  });

  describe('GET /urls', () => {
    it('should return 200 and url(s)', async () => {
      const user = {
        email: 'User15@example.com',
        password: 'StrongPa5$15',
        username: 'User15',
      };
      const createdUser = await authService.signup({ ...user });
      const { accessToken } = await authService.login({
        username: user.username,
        password: user.password,
      });
      const url = {
        origin: 'https://google.com',
        shorten: 'abc123',
      };
      await urlService.create(createdUser._id, { ...url });

      const response = await request(app.getHttpServer())
        .get('/urls')
        .set('Authorization', 'Bearer ' + accessToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Url(s) successfully retrieved',
          data: expect.arrayContaining([
            expect.objectContaining({
              _id: expect.any(String),
              shorten: url.shorten,
              origin: url.origin,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            }),
          ]),
        }),
      );
      expect(Types.ObjectId.isValid(response.body.data[0]._id)).toBe(true);
      expect(Date.parse(response.body.data[0].createdAt)).toBeTruthy();
      expect(Date.parse(response.body.data[0].updatedAt)).toBeTruthy();
    });
  });

  describe('GET /urls/:shorten', () => {
    it('should return origin url', async () => {
      const user = {
        email: 'User16@example.com',
        password: 'StrongPa5$16',
        username: 'User16',
      };
      const createdUser = await authService.signup({ ...user });
      const { accessToken } = await authService.login({
        username: user.username,
        password: user.password,
      });
      const url = {
        origin: 'https://google.com',
        shorten: 'abc123',
      };
      await urlService.create(createdUser._id, { ...url });

      const response = await request(app.getHttpServer())
        .get(`/urls/${url.shorten}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'Original url found',
          data: url.origin,
        }),
      );
    });
  });

  describe('DELETE /urls', () => {
    it('should return 200', async () => {
      const user = {
        email: 'User17@example.com',
        password: 'StrongPa5$17',
        username: 'User17',
      };
      const createdUser = await authService.signup({ ...user });
      const { accessToken } = await authService.login({
        username: user.username,
        password: user.password,
      });
      const url = {
        origin: 'https://google.com',
        shorten: 'abc123',
      };
      const createdUrl = await urlService.create(createdUser._id, { ...url });
      const requestBody: DeleteUrlDto = { idsToDelete: [createdUrl._id] };

      const response = await request(app.getHttpServer())
        .delete('/urls')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          message: `${requestBody.idsToDelete.length} Url(s) successfully deleted`,
        }),
      );
    });
  });

  // describe('DELETE /urls/:shorten', () => {
  //   it('should return 200 and deleted url', async () => {
  //     const user = {
  //       email: 'User17@example.com',
  //       password: 'StrongPa5$17',
  //       username: 'User17',
  //     };
  //     const createdUser = await authService.signup({ ...user });
  //     const { accessToken } = await authService.login({
  //       username: user.username,
  //       password: user.password,
  //     });
  //     const url = {
  //       origin: 'https://google.com',
  //       shorten: 'abc123',
  //     };
  //     await urlService.create(createdUser._id, { ...url });

  //     const response = await request(app.getHttpServer())
  //       .delete(`/urls/${url.shorten}`)
  //       .set('Authorization', 'Bearer ' + accessToken)
  //       .send();

  //     expect(response.status).toBe(200);
  //     expect(response.body).toEqual(
  //       expect.objectContaining({
  //         message: 'Url successfully deleted',
  //         data: expect.objectContaining({
  //           _id: expect.any(String),
  //           shorten: url.shorten,
  //           origin: url.origin,
  //           createdAt: expect.any(String),
  //           updatedAt: expect.any(String),
  //         }),
  //       }),
  //     );
  //     expect(Types.ObjectId.isValid(response.body.data._id)).toBe(true);
  //     expect(Date.parse(response.body.data.createdAt)).toBeTruthy();
  //     expect(Date.parse(response.body.data.updatedAt)).toBeTruthy();
  //   });
  // });
});
