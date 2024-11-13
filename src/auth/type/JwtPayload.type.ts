import { Types } from 'mongoose';

export type JwtPayload = {
  sub: Types.ObjectId;
};
