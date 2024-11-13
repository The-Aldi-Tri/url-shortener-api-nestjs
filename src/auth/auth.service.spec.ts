import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { ChangePasswordAuthDto } from './dto/change-password-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { JwtPayload } from './type/JwtPayload.type';

describe('AuthService', () => {
  let authService: AuthService;
  let configService: ConfigService;
  let jwtService: JwtService;
  let userService: UserService;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string): string => {
      const config: Record<string, string> = {
        JWT_SECRET_ACCESS_TOKEN: 'secret',
        JWT_SECRET_REFRESH_TOKEN: 'refreshSecret',
        JWT_EXPIRATION_ACCESS_TOKEN: '1h',
        JWT_EXPIRATION_REFRESH_TOKEN: '7d',
        HASH_SALT: '10',
      };
      return config[key];
    }),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUserService = {
    create: jest.fn(),
    findOne: jest.fn(),
    getUserPassword: jest.fn(),
    updateById: jest.fn(),
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
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should return an access token', () => {
      const payload: JwtPayload = { sub: userExampleFull._id };
      const mockAccessToken = 'jsonwebtoken';
      jwtService.sign = jest.fn().mockReturnValue('jsonwebtoken');

      const accessToken = authService.generateAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: configService.getOrThrow<string>('JWT_SECRET_ACCESS_TOKEN'),
        expiresIn: configService.getOrThrow<string>(
          'JWT_EXPIRATION_ACCESS_TOKEN',
        ),
      });
      expect(accessToken).toBe(mockAccessToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a refresh token', () => {
      const payload: JwtPayload = { sub: userExampleFull._id };
      const mockRefreshToken = 'jsonwebtoken';
      jwtService.sign = jest.fn().mockReturnValue('jsonwebtoken');

      const refreshToken = authService.generateRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: configService.getOrThrow<string>('JWT_SECRET_REFRESH_TOKEN'),
        expiresIn: configService.getOrThrow<string>(
          'JWT_EXPIRATION_REFRESH_TOKEN',
        ),
      });
      expect(refreshToken).toBe(mockRefreshToken);
    });
  });

  describe('hash', () => {
    it('should return hashed text', async () => {
      const plainText = 'password';
      const mockHashedText = 'hashedPassword';
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('hashedPassword'));

      const hashedText = await authService.hash(plainText);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        plainText,
        Number(configService.getOrThrow<string>('HASH_SALT')),
      );
      expect(hashedText).toBe(mockHashedText);
    });
  });

  describe('compareHash', () => {
    it('should return true if match', async () => {
      const plainText = 'password';
      const hashedText = 'hashedPassword';
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const isMatch = await authService.compareHash(plainText, hashedText);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainText, hashedText);
      expect(isMatch).toBe(true);
    });

    it('should return false if not match', async () => {
      const plainText = 'password';
      const hashedText = 'wrongHashed';
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      const isMatch = await authService.compareHash(plainText, hashedText);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainText, hashedText);
      expect(isMatch).toBe(false);
    });
  });

  describe('signup', () => {
    it('should successfully create a new user', async () => {
      const signupDto: SignupAuthDto = {
        username: userExampleFull.username,
        email: userExampleFull.email,
        password: 'password',
      };
      const hashedPassword = userExampleFull.password;
      const mockCreatedUser = { ...userExample };
      authService.hash = jest.fn().mockResolvedValue(userExampleFull.password);
      userService.create = jest.fn().mockResolvedValue({ ...userExample });

      const createdUser = await authService.signup(signupDto);

      expect(userService.create).toHaveBeenCalledWith({
        ...signupDto,
        password: hashedPassword,
      });
      expect(createdUser).toEqual(mockCreatedUser);
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens on successful login', async () => {
      const loginDto1: LoginAuthDto = {
        username: userExampleFull.username,
        password: 'password',
      };
      const loginDto2: LoginAuthDto = {
        email: userExampleFull.email,
        password: 'password',
      };
      const user: User = { ...userExample };
      const storedPassword = 'hashedPassword';
      const mockTokens = {
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      };
      userService.findOne = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);
      userService.getUserPassword = jest
        .fn()
        .mockResolvedValue('hashedPassword');
      authService.compareHash = jest.fn().mockResolvedValue(true);
      jwtService.sign = jest
        .fn()
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken')
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken');

      const result1 = await authService.login(loginDto1);
      const result2 = await authService.login(loginDto2);

      expect(userService.findOne).toHaveBeenNthCalledWith(1, {
        username: loginDto1.username,
        email: undefined,
      });
      expect(userService.findOne).toHaveBeenNthCalledWith(2, {
        email: loginDto2.email,
        username: undefined,
      });
      expect(userService.getUserPassword).toHaveBeenNthCalledWith(1, user._id);
      expect(userService.getUserPassword).toHaveBeenNthCalledWith(2, user._id);
      expect(authService.compareHash).toHaveBeenNthCalledWith(
        1,
        loginDto1.password,
        storedPassword,
      );
      expect(authService.compareHash).toHaveBeenNthCalledWith(
        2,
        loginDto2.password,
        storedPassword,
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        {
          sub: user._id,
        },
        {
          secret: configService.getOrThrow<string>('JWT_SECRET_ACCESS_TOKEN'),
          expiresIn: configService.getOrThrow<string>(
            'JWT_EXPIRATION_ACCESS_TOKEN',
          ),
        },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          sub: user._id,
        },
        {
          secret: configService.getOrThrow<string>('JWT_SECRET_REFRESH_TOKEN'),
          expiresIn: configService.getOrThrow<string>(
            'JWT_EXPIRATION_REFRESH_TOKEN',
          ),
        },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        3,
        {
          sub: user._id,
        },
        {
          secret: configService.getOrThrow<string>('JWT_SECRET_ACCESS_TOKEN'),
          expiresIn: configService.getOrThrow<string>(
            'JWT_EXPIRATION_ACCESS_TOKEN',
          ),
        },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        4,
        {
          sub: user._id,
        },
        {
          secret: configService.getOrThrow<string>('JWT_SECRET_REFRESH_TOKEN'),
          expiresIn: configService.getOrThrow<string>(
            'JWT_EXPIRATION_REFRESH_TOKEN',
          ),
        },
      );
      expect(result1).toEqual(mockTokens);
      expect(result2).toEqual(mockTokens);
    });

    it('should throw BadRequestException for incorrect password', async () => {
      const loginDto: LoginAuthDto = {
        username: userExampleFull.username,
        password: 'wrongPassword',
      };
      const user: User = { ...userExample };
      const storedPassword = 'hashedPassword';
      userService.findOne = jest
        .fn()
        .mockResolvedValue({ ...userExample } as User);
      userService.getUserPassword = jest
        .fn()
        .mockResolvedValue('hashedPassword');
      authService.compareHash = jest.fn().mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new BadRequestException('Password is incorrect'),
      );
      expect(userService.findOne).toHaveBeenCalledWith({
        username: loginDto.username,
        email: undefined,
      });
      expect(userService.getUserPassword).toHaveBeenCalledWith(user._id);
      expect(authService.compareHash).toHaveBeenCalledWith(
        loginDto.password,
        storedPassword,
      );
    });
  });

  describe('changePassword', () => {
    it('should change the password successfully', async () => {
      const id = userExampleFull._id;
      const changePasswordDto: ChangePasswordAuthDto = {
        password: userExampleFull.password,
        newPassword: 'newPassword123',
      };
      const storedPassword = 'hashedOldPassword';

      userService.getUserPassword = jest
        .fn()
        .mockResolvedValue('hashedOldPassword');
      authService.compareHash = jest.fn().mockResolvedValue(true);
      authService.hash = jest.fn().mockResolvedValue('hashedNewPassword');
      userService.updateById = jest.fn().mockResolvedValue(undefined);

      await authService.changePassword(id, changePasswordDto);

      expect(userService.getUserPassword).toHaveBeenCalledWith(id);
      expect(authService.compareHash).toHaveBeenCalledWith(
        changePasswordDto.password,
        storedPassword,
      );
      expect(authService.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
      );
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      const id = userExampleFull._id;
      const changePasswordDto: ChangePasswordAuthDto = {
        password: 'wrongPassword',
        newPassword: 'newPassword123',
      };
      const storedPassword = 'hashedOldPassword';

      userService.getUserPassword = jest
        .fn()
        .mockResolvedValue('hashedOldPassword');
      authService.compareHash = jest.fn().mockResolvedValue(false);

      await expect(
        authService.changePassword(id, changePasswordDto),
      ).rejects.toThrow(new BadRequestException('Password is incorrect'));
      expect(userService.getUserPassword).toHaveBeenCalledWith(id);
      expect(authService.compareHash).toHaveBeenCalledWith(
        changePasswordDto.password,
        storedPassword,
      );
    });
  });
});
