import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { DeleteResult, Model, Query, Types } from 'mongoose';
import { CreateUrlDto } from './dto/create-url.dto';
import { Url, UrlDocument } from './schema/url.schema';
import { UrlService } from './url.service';

describe('UrlService', () => {
  let urlService: UrlService;
  let urlModel: Model<Url>;

  const mockUrlModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
  };

  const urlExample = {
    _id: new Types.ObjectId(),
    origin: 'https://example.com',
    shorten: 'abc123',
    userId: new Types.ObjectId(),
    clicks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const urlExampleFull = {
    ...urlExample,
    __v: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlService,
        {
          provide: getModelToken(Url.name),
          useValue: mockUrlModel,
        },
      ],
    }).compile();

    urlService = module.get<UrlService>(UrlService);
    urlModel = module.get<Model<Url>>(getModelToken(Url.name));
  });

  it('should be defined', () => {
    expect(urlService).toBeDefined();
  });

  describe('createUrl', () => {
    it('should create a new URL successfully', async () => {
      const createUrlDto: CreateUrlDto = {
        origin: urlExampleFull.origin,
        shorten: urlExampleFull.shorten,
      };
      const userId = urlExampleFull.userId;
      const urlDoc = { ...urlExample } as unknown as UrlDocument;
      const mockAddedUrl = { ...urlExample };

      urlModel.create = jest.fn().mockResolvedValue(urlDoc);
      urlDoc.toObject = jest.fn().mockReturnValue({ ...urlExample });

      const addedUrl = await urlService.createUrl(userId, createUrlDto);

      expect(urlModel.create).toHaveBeenCalledWith({
        ...createUrlDto,
        userId,
      });
      expect(urlDoc.toObject).toHaveBeenCalled();
      expect(addedUrl).toEqual(mockAddedUrl);
    });
  });

  describe('findUrlsByUserId', () => {
    it('should return all URLs for a user', async () => {
      const userId = urlExampleFull.userId;
      const query = {} as Query<UrlDocument[], UrlDocument>;
      const queryAfterSort = {} as Query<UrlDocument[], UrlDocument>;
      const queryAfterLean = {} as Query<Url, UrlDocument>;
      urlModel.find = jest.fn().mockReturnValue(query);
      query.sort = jest.fn().mockReturnValue(queryAfterSort);
      queryAfterSort.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue([{ ...urlExample }]);
      const mockUrls = [{ ...urlExample }];

      const urls = await urlService.findUrlsByUserId(userId);

      expect(urlModel.find).toHaveBeenCalledWith({ userId });
      expect(query.sort).toHaveBeenCalled();
      expect(queryAfterSort.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(urls).toEqual(mockUrls);
    });
  });

  describe('findUrlByShorten', () => {
    it('should return the URL if found', async () => {
      const shorten = urlExampleFull.shorten;
      const query = {} as Query<UrlDocument, UrlDocument>;
      const queryAfterLean = {} as Query<Url, UrlDocument>;
      urlModel.findOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue({ ...urlExample });
      const mockUrl = { ...urlExample };

      const url = await urlService.findUrlByShorten(shorten);

      expect(urlModel.findOne).toHaveBeenCalledWith({ shorten });
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
      expect(url).toEqual(mockUrl);
    });

    it('should throw NotFoundException if URL not found', async () => {
      const shorten = 'not-found';
      const query = {} as Query<null, UrlDocument>;
      const queryAfterLean = {} as Query<null, null>;
      urlModel.findOne = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest.fn().mockResolvedValue(null);

      await expect(urlService.findUrlByShorten(shorten)).rejects.toThrow(
        new NotFoundException(`Url not found`),
      );
      expect(urlModel.findOne).toHaveBeenCalledWith({ shorten });
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('incrementUrlClicks', () => {
    it('should increment clicks for the URL', async () => {
      const id = urlExampleFull._id;
      const query = {} as Query<UrlDocument, UrlDocument>;
      const queryAfterLean = {} as Query<Url, UrlDocument>;
      urlModel.findByIdAndUpdate = jest.fn().mockReturnValue(query);
      query.lean = jest.fn().mockReturnValue(queryAfterLean);
      queryAfterLean.exec = jest
        .fn()
        .mockResolvedValue({ ...urlExample, clicks: urlExample.clicks + 1 });

      await urlService.incrementUrlClicks(id);

      expect(urlModel.findByIdAndUpdate).toHaveBeenCalledWith(id, {
        $inc: { clicks: 1 },
      });
      expect(query.lean).toHaveBeenCalled();
      expect(queryAfterLean.exec).toHaveBeenCalled();
    });
  });

  describe('deleteUrlsByUserIds', () => {
    it('should delete the URL(s) successfully', async () => {
      const userId = urlExampleFull.userId;
      const id = urlExampleFull._id;
      const ids = [id];
      const query = {} as Query<DeleteResult, UrlDocument>;
      urlModel.deleteMany = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue({ deletedCount: ids.length });
      const mockDeletedUrl = ids.length;

      const deletedUrl = await urlService.deleteUrlsByUserIds(userId, ids);

      expect(urlModel.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ids },
        userId,
      });
      expect(query.exec).toHaveBeenCalled();
      expect(deletedUrl).toEqual(mockDeletedUrl);
    });
  });

  // describe('remove', () => {
  //   it('should delete the URL successfully', async () => {
  //     const userId = urlExampleFull._id;
  //     const shorten = urlExampleFull.shorten;
  //     const query = {} as Query<UrlDocument, UrlDocument>;
  //     const queryAfterLean = {} as Query<Url, UrlDocument>;
  //     urlModel.findOneAndDelete = jest.fn().mockReturnValue(query);
  //     query.lean = jest.fn().mockReturnValue(queryAfterLean);
  //     queryAfterLean.exec = jest.fn().mockResolvedValue({ ...urlExample });
  //     const mockDeletedUrl = { ...urlExample };

  //     const deletedUrl = await urlService.remove(userId, shorten);

  //     expect(urlModel.findOneAndDelete).toHaveBeenCalledWith({
  //       userId,
  //       shorten,
  //     });
  //     expect(query.lean).toHaveBeenCalled();
  //     expect(queryAfterLean.exec).toHaveBeenCalled();
  //     expect(deletedUrl).toEqual(mockDeletedUrl);
  //   });

  //   it('should throw NotFoundException if URL not found', async () => {
  //     const userId = urlExampleFull._id;
  //     const shorten = 'not-found';
  //     const query = {} as Query<null, UrlDocument>;
  //     const queryAfterLean = {} as Query<null, null>;
  //     urlModel.findOneAndDelete = jest.fn().mockReturnValue(query);
  //     query.lean = jest.fn().mockReturnValue(queryAfterLean);
  //     queryAfterLean.exec = jest.fn().mockResolvedValue(null);

  //     await expect(urlService.remove(userId, shorten)).rejects.toThrow(
  //       new NotFoundException(`Url not found`),
  //     );
  //     expect(urlModel.findOneAndDelete).toHaveBeenCalledWith({
  //       userId,
  //       shorten,
  //     });
  //     expect(query.lean).toHaveBeenCalled();
  //     expect(queryAfterLean.exec).toHaveBeenCalled();
  //   });
  // });
});
