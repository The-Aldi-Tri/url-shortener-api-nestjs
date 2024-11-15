import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    required: true,
    select: false, // Exclude password from query, add .select('+password) to include it
  })
  password?: string;

  @Prop({ default: false })
  is_verified: boolean;

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

export const UserSchema = SchemaFactory.createForClass(User);
