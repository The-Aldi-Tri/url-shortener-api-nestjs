import { Model } from 'mongoose';
import { AuthService } from '../../src/auth/auth.service';
import { User, UserDocument } from '../../src/user/schema/user.schema';
import { faker } from './faker';
import { generateStrongPassword } from './generateStrongPassword';

type createUserRecordType = {
  user: UserDocument;
  password: string;
};

export const createUserRecord = async (
  userModel: Model<User>,
  authService: AuthService,
  is_verified = true,
): Promise<createUserRecordType> => {
  const password = generateStrongPassword();

  const user = await userModel.create({
    email: faker.internet.email(),
    password: await authService.hash(password),
    username: faker.internet.username(),
    is_verified: is_verified,
  });

  return { user, password };
};
