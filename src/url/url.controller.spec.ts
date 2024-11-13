import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../auth/type/AuthenticatedRequest.type';
import { CreateUrlDto } from './dto/create-url.dto';
import { DeleteUrlDto } from './dto/delete-url.dto';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';

describe('UrlController', () => {
  let urlController: UrlController;
  let urlService: UrlService;

  const mockUrlService = {
    create: jest.fn(),
    findUrlsByUserId: jest.fn(),
    findByShorten: jest.fn(),
    incrementClicks: jest.fn(),
    remove: jest.fn(),
  };

  const urlExample = {
    _id: new Types.ObjectId(),
    clicks: 0,
    origin: 'http://example.com',
    shorten: 'abc',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: new Types.ObjectId(),
    _v: 0,
  };

  const urlExampleFull = {
    ...urlExample,
    _v: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlController],
      providers: [{ provide: UrlService, useValue: mockUrlService }],
    }).compile();

    urlController = module.get<UrlController>(UrlController);
    urlService = module.get<UrlService>(UrlService);
  });

  it('should be defined', () => {
    expect(urlController).toBeDefined();
  });

  describe('create', () => {
    it('should return created URL successfully', async () => {
      const req = {
        user: { id: urlExampleFull.userId },
      } as AuthenticatedRequest;
      const createUrlDto: CreateUrlDto = {
        origin: urlExampleFull.origin,
        shorten: urlExampleFull.shorten,
      };
      const createdUrl = { ...urlExample };
      const mockResult = {
        message: 'Url successfully created',
        data: createdUrl,
      };
      urlService.create = jest.fn().mockResolvedValue({ ...urlExample });

      const result = await urlController.create(req, createUrlDto);

      expect(result).toEqual(mockResult);
      expect(urlService.create).toHaveBeenCalledWith(req.user.id, createUrlDto);
    });
  });

  describe('findAllByUserId', () => {
    it('should return all URLs for the user successfully', async () => {
      const req = {
        user: { id: urlExampleFull.userId },
      } as AuthenticatedRequest;
      const urls = [{ ...urlExample }];
      const mockResult = {
        message: 'Url(s) successfully retrieved',
        data: urls,
      };
      urlService.findUrlsByUserId = jest
        .fn()
        .mockResolvedValue([{ ...urlExample }]);

      const result = await urlController.findAllByUserId(req);

      expect(result).toEqual(mockResult);
      expect(urlService.findUrlsByUserId).toHaveBeenCalledWith(req.user.id);
    });
  });

  describe('findOne', () => {
    it('should redirect to the original URL successfully', async () => {
      const shorten = urlExampleFull.shorten;
      const url = { ...urlExample };
      const mockResult = { message: 'Original url found', data: url.origin };
      urlService.findByShorten = jest.fn().mockResolvedValue(url);
      urlService.incrementClicks = jest.fn().mockResolvedValue(undefined);

      const result = await urlController.findOne(shorten);

      expect(result).toEqual(mockResult);
      expect(urlService.findByShorten).toHaveBeenCalledWith(shorten);
      expect(urlService.incrementClicks).toHaveBeenCalledWith(url._id);
    });
  });

  describe('remove', () => {
    it('should return deleted URL successfully', async () => {
      const req = {
        user: { id: urlExampleFull.userId },
      } as AuthenticatedRequest;
      const id = urlExampleFull._id;
      const ids: DeleteUrlDto = { idsToDelete: [id] };
      const deleteCount = ids.idsToDelete.length;
      const mockResult = {
        message: `${deleteCount} Url(s) successfully deleted`,
      };
      urlService.deleteManyByUserId = jest
        .fn()
        .mockResolvedValue(ids.idsToDelete.length);

      const result = await urlController.remove(req, ids);

      expect(result).toEqual(mockResult);
      expect(urlService.deleteManyByUserId).toHaveBeenCalledWith(
        req.user.id,
        ids.idsToDelete,
      );
    });
  });

  // describe('remove', () => {
  //   it('should return deleted URL successfully', async () => {
  //     const req = {
  //       user: { id: urlExampleFull.userId },
  //     } as AuthenticatedRequest;
  //     const shorten = urlExampleFull.shorten;
  //     const deletedUrl = { ...urlExample };
  //     const mockResult = {
  //       message: 'Url successfully deleted',
  //       data: deletedUrl,
  //     };
  //     urlService.remove = jest.fn().mockResolvedValue({ ...urlExample });

  //     const result = await urlController.remove(req, shorten);

  //     expect(result).toEqual(mockResult);
  //     expect(urlService.remove).toHaveBeenCalledWith(req.user.id, shorten);
  //   });
  // });
});
