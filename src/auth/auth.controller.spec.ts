import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { User } from 'src/user/schema/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChangePasswordAuthDto } from './dto/change-password-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { AuthenticatedRequest } from './type/AuthenticatedRequest.type';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockUserService = {
    signup: jest.fn(),
    login: jest.fn(),
    generateAccessToken: jest.fn(),
    changePassword: jest.fn(),
  };

  const userExample: User = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    username: 'testUser',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const userExampleFull: Required<User> = {
    ...userExample,
    password: 'hashedPassword',
    __v: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockUserService }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
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
        email: userExampleFull.email,
        username: userExampleFull.username,
        password: 'PASSWORD',
      };
      const addedUser = { ...userExample };
      const mockResult = {
        message: 'User successfully created',
        data: addedUser,
      };
      authService.signup = jest.fn().mockResolvedValue({ ...userExample });

      const result = await authController.signup(signupAuthDto);

      expect(result).toEqual(mockResult);
      expect(authService.signup).toHaveBeenCalledWith(signupAuthDto);
    });
  });

  describe('login', () => {
    it('should return success message and tokens', async () => {
      const loginAuthDto1: LoginAuthDto = {
        email: userExampleFull.email,
        password: '<PASSWORD>',
      };
      const loginAuthDto2: LoginAuthDto = {
        username: userExampleFull.username,
        password: '<PASSWORD>',
      };
      const tokens = {
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      };
      const mockResult = {
        message: 'Login success',
        data: tokens,
      };
      authService.login = jest.fn().mockResolvedValue(tokens);

      const result1 = await authController.login(loginAuthDto1);
      const result2 = await authController.login(loginAuthDto2);

      expect(result1).toEqual(mockResult);
      expect(result2).toEqual(mockResult);
      expect(authService.login).toHaveBeenNthCalledWith(1, loginAuthDto1);
      expect(authService.login).toHaveBeenNthCalledWith(2, loginAuthDto2);
    });
  });

  describe('refresh', () => {
    it('should return new access token', () => {
      const req = { user: { id: userExampleFull._id } } as AuthenticatedRequest;
      const newAccessToken = 'newAccessToken';
      const mockResult = {
        message: 'Refresh token success',
        data: { accessToken: newAccessToken },
      };
      authService.generateAccessToken = jest
        .fn()
        .mockReturnValue(newAccessToken);

      const result = authController.refresh(req);

      expect(result).toEqual(mockResult);
      expect(authService.generateAccessToken).toHaveBeenCalledWith({
        sub: req.user.id,
      });
    });
  });

  describe('changePassword', () => {
    it('should return success message', async () => {
      const req = { user: { id: userExampleFull._id } } as AuthenticatedRequest;
      const changePasswordAuthDto: ChangePasswordAuthDto = {
        password: '<PASSWORD>',
        newPassword: '<NEW_PASSWORD>',
      };
      const mockResult = { message: 'Password successfully changed' };
      authService.changePassword = jest.fn().mockResolvedValue(undefined);

      const result = await authController.changePassword(
        req,
        changePasswordAuthDto,
      );

      expect(result).toEqual(mockResult);
      expect(authService.changePassword).toHaveBeenCalledWith(
        req.user.id,
        changePasswordAuthDto,
      );
    });
  });
});
