import { Request } from 'express';
import { Types } from 'mongoose';

type UserType = { id: Types.ObjectId };

export type AuthenticatedRequest = Request & { user: UserType };
