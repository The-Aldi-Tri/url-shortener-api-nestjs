import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VerificationDocument = HydratedDocument<Verification>;

@Schema({
  collection: 'verification',
})
export class Verification {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  verificationCode: number;

  @Prop({
    default: Date.now(),
    expires: 5 * 60, // 5 minute
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

export const VerificationSchema = SchemaFactory.createForClass(Verification);
