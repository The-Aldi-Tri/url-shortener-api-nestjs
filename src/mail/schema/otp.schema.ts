import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({
  collection: 'otp',
})
export class Otp {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  otp: number;

  @Prop({
    default: Date.now(),
    expires: 60 * 5,
  })
  createdAt: Date;

  @Prop({
    select: false,
  })
  __v?: number;

  // Managed by Mongoose
  // No need Prop decorator
  // Just to satisfy Typescript (type checking)
  _id: Types.ObjectId;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
