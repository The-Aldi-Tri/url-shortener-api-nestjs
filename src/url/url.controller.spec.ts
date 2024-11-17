import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { faker } from '../../test/utils/faker';
import { AuthenticatedRequest } from '../auth/type/AuthenticatedRequest.type';
import { CreateUrlDto } from './dto/create-url.dto';
import { DeleteUrlDto } from './dto/delete-url.dto';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';

describe('UrlController', () => {
  let urlController: UrlController;

  const mockUrlService = {
    createUrl: jest.fn(),
    findUrlsByUserId: jest.fn(),
    findUrlByShorten: jest.fn(),
    incrementUrlClicks: jest.fn(),
    deleteUrlsByIds: jest.fn(),
  };

  const generateUrl = (userId: Types.ObjectId | null = null) => {
    return {
      _id: new Types.ObjectId(faker.database.mongodbObjectId()),
      origin: faker.internet.url(),
      shorten: faker.internet.domainWord(),
      userId: userId ?? new Types.ObjectId(faker.database.mongodbObjectId()),
      clicks: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  };

  beforeAll(() => {
    faker.seed(6);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [{ provide: UrlService, useValue: mockUrlService }],
    }).compile();

    urlController = module.get<UrlController>(UrlController);
  });

  it('should be defined', () => {
    expect(urlController).toBeDefined();
  });

  describe('create', () => {
    it('should return created URL successfully', async () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;

      const createUrlDto: CreateUrlDto = {
        origin: faker.internet.url(),
        shorten: faker.internet.domainWord(),
      };

      const createdUrl = generateUrl(req.user.id);

      const mockResult = {
        statusCode: 201,
        message: 'Url successfully created',
        data: createdUrl,
      };

      mockUrlService.createUrl.mockResolvedValue({ ...createdUrl });

      const result = await urlController.create(req, createUrlDto);

      expect(result).toEqual(mockResult);
      expect(mockUrlService.createUrl).toHaveBeenCalledWith(
        req.user.id,
        createUrlDto,
      );
    });
  });

  describe('findAllByUserId', () => {
    it('should return all URLs for the user successfully', async () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;

      const url = generateUrl(req.user.id);

      const urls = [{ ...url }];

      const mockResult = {
        statusCode: 200,
        message: 'Url(s) successfully retrieved',
        data: urls,
      };

      mockUrlService.findUrlsByUserId.mockResolvedValue([...urls]);

      const result = await urlController.findAllByUserId(req);

      expect(result).toEqual(mockResult);
      expect(mockUrlService.findUrlsByUserId).toHaveBeenCalledWith(req.user.id);
    });
  });

  describe('findOne', () => {
    it('should redirect to the original URL successfully', async () => {
      const shorten = faker.internet.domainWord();

      const url = generateUrl();
      url.shorten = shorten;

      const mockResult = {
        statusCode: 200,
        message: 'Original url found',
        data: url.origin,
      };

      mockUrlService.findUrlByShorten.mockResolvedValue({ ...url });
      mockUrlService.incrementUrlClicks.mockResolvedValue(undefined);

      const result = await urlController.findOne(shorten);

      expect(result).toEqual(mockResult);
      expect(mockUrlService.findUrlByShorten).toHaveBeenCalledWith(shorten);
      expect(mockUrlService.incrementUrlClicks).toHaveBeenCalledWith(url._id);
    });
  });

  describe('remove', () => {
    it('should return deleted URL successfully', async () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;

      const urlId = new Types.ObjectId(faker.database.mongodbObjectId());

      const ids: DeleteUrlDto = { idsToDelete: [urlId] };

      const deleteCount = ids.idsToDelete.length;

      const mockResult = {
        statusCode: 200,
        message: `${deleteCount} Url(s) successfully deleted`,
      };

      mockUrlService.deleteUrlsByIds.mockResolvedValue(ids.idsToDelete.length);

      const result = await urlController.remove(req, ids);

      expect(result).toEqual(mockResult);
      expect(mockUrlService.deleteUrlsByIds).toHaveBeenCalledWith(
        req.user.id,
        ids.idsToDelete,
      );
    });
  });
});
