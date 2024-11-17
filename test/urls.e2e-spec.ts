import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import * as request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { DeleteUrlDto } from '../src/url/dto/delete-url.dto';
import { Url } from '../src/url/schema/url.schema';
import { User } from '../src/user/schema/user.schema';
import { AppModule } from './../src/app.module';
import { createUserRecord } from './utils/createUserRecord';
import { faker } from './utils/faker';

describe('Urls routes (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let urlModel: Model<Url>;
  let authService: AuthService;

  beforeAll(() => {
    faker.seed(103);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    urlModel = moduleFixture.get<Model<Url>>(getModelToken(Url.name));
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
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
    it('should return 201 and created url', async () => {
      const { user } = await createUserRecord(userModel, authService);
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const requestBody = {
        origin: faker.internet.url(),
        shorten: faker.internet.domainWord(),
      };

      const response = await request(app.getHttpServer())
        .post('/urls')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 201,
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
      const { user } = await createUserRecord(userModel, authService);
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const url = await urlModel.create({
        userId: user._id,
        origin: faker.internet.url(),
        shorten: faker.internet.domainWord(),
      });

      const response = await request(app.getHttpServer())
        .get('/urls')
        .set('Authorization', 'Bearer ' + accessToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
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
      const { user } = await createUserRecord(userModel, authService);
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const url = await urlModel.create({
        userId: user._id,
        origin: faker.internet.url(),
        shorten: faker.internet.domainWord(),
      });

      const response = await request(app.getHttpServer())
        .get(`/urls/${url.shorten}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: 'Original url found',
          data: url.origin,
        }),
      );
    });
  });

  describe('DELETE /urls', () => {
    it('should return 200', async () => {
      const { user } = await createUserRecord(userModel, authService);
      const accessToken = authService.generateAccessToken({ sub: user._id });
      const url = await urlModel.create({
        userId: user._id,
        origin: faker.internet.url(),
        shorten: faker.internet.domainWord(),
      });
      const requestBody: DeleteUrlDto = { idsToDelete: [url._id] };

      const response = await request(app.getHttpServer())
        .delete('/urls')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ ...requestBody });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 200,
          message: `${requestBody.idsToDelete.length} Url(s) successfully deleted`,
        }),
      );
    });
  });
});
