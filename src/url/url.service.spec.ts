import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { faker } from '../../test/utils/faker';
import { CreateUrlDto } from './dto/create-url.dto';
import { Url } from './schema/url.schema';
import { UrlService } from './url.service';

describe('UrlService', () => {
  let urlService: UrlService;

  const mockUrlModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
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
    faker.seed(5);
  });

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
  });

  it('should be defined', () => {
    expect(urlService).toBeDefined();
  });

  describe('createUrl', () => {
    it('should create a new URL successfully', async () => {
      const createUrlDto: CreateUrlDto = {
        origin: faker.internet.url(),
        shorten: faker.internet.domainWord(),
      };

      const userId = new Types.ObjectId(faker.database.mongodbObjectId());

      const mockAddedUrl = generateUrl(userId);

      mockUrlModel.create.mockReturnValue({
        toObject: jest.fn().mockResolvedValue({ ...mockAddedUrl }),
      });

      const addedUrl = await urlService.createUrl(userId, createUrlDto);

      expect(mockUrlModel.create).toHaveBeenCalledWith({
        ...createUrlDto,
        userId,
      });
      expect(addedUrl).toEqual(mockAddedUrl);
    });
  });

  describe('findUrlsByUserId', () => {
    it('should return all URLs for a user', async () => {
      const userId = new Types.ObjectId(faker.database.mongodbObjectId());

      const url = generateUrl(userId);

      const mockUrls = [{ ...url }];

      mockUrlModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ ...url }]),
          }),
        }),
      });

      const urls = await urlService.findUrlsByUserId(userId);

      expect(mockUrlModel.find).toHaveBeenCalledWith({ userId });
      expect(mockUrlModel.find().sort).toHaveBeenCalledWith({
        createdAt: 'desc',
      });
      expect(urls).toEqual(mockUrls);
    });
  });

  describe('findUrlByShorten', () => {
    it('should return the URL if found', async () => {
      const shorten = faker.internet.domainWord();

      const mockUrl = generateUrl();
      mockUrl.shorten = shorten;

      mockUrlModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockUrl }),
        }),
      });

      const url = await urlService.findUrlByShorten(shorten);

      expect(mockUrlModel.findOne).toHaveBeenCalledWith({ shorten });
      expect(url).toEqual(mockUrl);
    });

    it('should throw NotFoundException if URL not found', async () => {
      const shorten = faker.internet.domainWord();

      mockUrlModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(urlService.findUrlByShorten(shorten)).rejects.toThrow(
        new NotFoundException(`Url not found`),
      );
      expect(mockUrlModel.findOne).toHaveBeenCalledWith({ shorten });
    });
  });

  describe('incrementUrlClicks', () => {
    it('should increment clicks for the URL', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());

      mockUrlModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await urlService.incrementUrlClicks(id);

      expect(mockUrlModel.findByIdAndUpdate).toHaveBeenCalledWith(id, {
        $inc: { clicks: 1 },
      });
    });
  });

  describe('deleteUrlsByIds', () => {
    it('should delete the URL(s) successfully', async () => {
      const userId = new Types.ObjectId(faker.database.mongodbObjectId());
      const urlId = new Types.ObjectId(faker.database.mongodbObjectId());
      const ids = [urlId];

      mockUrlModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: ids.length }),
      });

      const mockDeletedUrl = ids.length;

      const deletedUrl = await urlService.deleteUrlsByIds(userId, ids);

      expect(mockUrlModel.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ids },
        userId,
      });
      expect(deletedUrl).toEqual(mockDeletedUrl);
    });
  });
});
