import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/schema/user.schema';

export type UrlDocument = HydratedDocument<Url>;

@Schema({ collection: 'urls', timestamps: true })
export class Url {
  @Prop({ required: true })
  origin: string;

  @Prop({ required: true, unique: true })
  shorten: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: User;

  @Prop({ default: 0 })
  clicks: number;

  @Prop({
    select: false,
  })
  __v?: number;

  // Managed by Mongoose
  // No need Prop decorator
  // Just to satisfy Typescript (type checking)
  createdAt: Date;
  updatedAt: Date;
  _id: Types.ObjectId;
}

export const UrlSchema = SchemaFactory.createForClass(Url);
