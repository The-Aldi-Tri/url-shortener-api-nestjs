import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { User } from 'src/user/schema/user.schema';
import { faker } from '../../test/utils/faker';
import { generateStrongPassword } from '../../test/utils/generateStrongPassword';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChangePasswordAuthDto } from './dto/change-password-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { AuthenticatedRequest } from './type/AuthenticatedRequest.type';

describe('AuthController', () => {
  let authController: AuthController;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    generateAccessToken: jest.fn(),
    changePassword: jest.fn(),
  };

  const generateUser = (is_verified = true): User => ({
    email: faker.internet.email(),
    username: faker.internet.username(),
    is_verified: is_verified,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    _id: new Types.ObjectId(faker.database.mongodbObjectId()),
  });

  beforeAll(() => {
    faker.seed(3);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('signup', () => {
    it('should return success message and user data', async () => {
      const signupAuthDto: SignupAuthDto = {
        email: faker.internet.email(),
        username: faker.internet.username(),
        password: generateStrongPassword(),
      };
      const addedUser = generateUser(false);
      const mockResult = {
        statusCode: 201,
        message: 'User successfully created',
        data: addedUser,
      };

      mockAuthService.signup.mockResolvedValue({ ...addedUser });

      const result = await authController.signup(signupAuthDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.signup).toHaveBeenCalledWith(signupAuthDto);
    });
  });

  describe('login', () => {
    it('should return success message and tokens', async () => {
      const loginAuthDto: LoginAuthDto = {
        email: faker.internet.email(),
        password: generateStrongPassword(),
      };
      const tokens = {
        accessToken: faker.internet.jwt(),
        refreshToken: faker.internet.jwt(),
      };
      const mockResult = {
        statusCode: 200,
        message: 'Login success',
        data: tokens,
      };
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await authController.login(loginAuthDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginAuthDto);
    });
  });

  describe('refresh', () => {
    it('should return new access token', () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;
      const newAccessToken = faker.internet.jwt();
      const mockResult = {
        statusCode: 200,
        message: 'Refresh token success',
        data: { accessToken: newAccessToken },
      };
      mockAuthService.generateAccessToken.mockReturnValue(newAccessToken);

      const result = authController.refresh(req);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.generateAccessToken).toHaveBeenCalledWith({
        sub: req.user.id,
      });
    });
  });

  describe('changePassword', () => {
    it('should return success message', async () => {
      const req = {
        user: { id: new Types.ObjectId(faker.database.mongodbObjectId()) },
      } as AuthenticatedRequest;
      const changePasswordAuthDto: ChangePasswordAuthDto = {
        password: generateStrongPassword(),
        newPassword: generateStrongPassword(),
      };
      const mockResult = {
        statusCode: 200,
        message: 'Password successfully changed',
      };
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const result = await authController.changePassword(
        req,
        changePasswordAuthDto,
      );

      expect(result).toEqual(mockResult);
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        req.user.id,
        changePasswordAuthDto,
      );
    });
  });
});
