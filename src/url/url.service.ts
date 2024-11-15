import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUrlDto } from './dto/create-url.dto';
import { Url } from './schema/url.schema';

@Injectable()
export class UrlService {
  constructor(@InjectModel(Url.name) private readonly urlModel: Model<Url>) {}

  async createUrl(
    userId: Types.ObjectId,
    createUrlDto: CreateUrlDto,
  ): Promise<Url> {
    const addedUrlDoc = await this.urlModel.create({ ...createUrlDto, userId });

    const addedUrl = addedUrlDoc.toObject();

    delete addedUrl.__v;

    return addedUrl;
  }

  async findUrlsByUserId(userId: Types.ObjectId): Promise<Url[]> {
    const urls = await this.urlModel
      .find({ userId })
      .sort({ createdAt: 'desc' })
      .lean()
      .exec();

    return urls;
  }

  async findUrlByShorten(shorten: string): Promise<Url> {
    const url = await this.urlModel.findOne({ shorten }).lean().exec();

    if (!url) {
      throw new NotFoundException(`Url not found`);
    }

    return url;
  }

  async incrementUrlClicks(id: Types.ObjectId): Promise<void> {
    await this.urlModel
      .findByIdAndUpdate(id, { $inc: { clicks: 1 } })
      .lean()
      .exec();
  }

  async deleteUrlsByUserIds(userId: Types.ObjectId, ids: Types.ObjectId[]) {
    const { deletedCount } = await this.urlModel
      .deleteMany({ _id: { $in: ids }, userId })
      .exec();

    return deletedCount;
  }
}
