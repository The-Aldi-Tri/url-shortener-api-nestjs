import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { faker } from '../../test/utils/faker';
import { generateStrongPassword } from '../../test/utils/generateStrongPassword';
import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { ChangePasswordAuthDto } from './dto/change-password-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupAuthDto } from './dto/signup-auth.dto';
import { JwtPayload } from './type/JwtPayload.type';

describe('AuthService', () => {
  let authService: AuthService;

  const mockConfigService = {
    getOrThrow<T = string>(key: string): T {
      const config: Record<string, string> = {
        JWT_SECRET_ACCESS_TOKEN: 'secret',
        JWT_SECRET_REFRESH_TOKEN: 'refreshSecret',
        JWT_EXPIRATION_ACCESS_TOKEN: '1h',
        JWT_EXPIRATION_REFRESH_TOKEN: '7d',
        HASH_SALT: '10',
      };
      return config[key] as T;
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUserService = {
    createUser: jest.fn(),
    findUser: jest.fn(),
    getUserPassword: jest.fn(),
    resetUserPassword: jest.fn(),
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
    faker.seed(2);
  });

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should return an access token', () => {
      const payload: JwtPayload = {
        sub: new Types.ObjectId(faker.database.mongodbObjectId()),
      };
      const mockAccessToken = faker.internet.jwt({ payload: payload });
      mockJwtService.sign.mockReturnValueOnce(mockAccessToken);

      const accessToken = authService.generateAccessToken(payload);

      expect(mockJwtService.sign).toHaveBeenCalledWith(payload, {
        secret: mockConfigService.getOrThrow<string>('JWT_SECRET_ACCESS_TOKEN'),
        expiresIn: mockConfigService.getOrThrow<string>(
          'JWT_EXPIRATION_ACCESS_TOKEN',
        ),
      });
      expect(accessToken).toBe(mockAccessToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a refresh token', () => {
      const payload: JwtPayload = {
        sub: new Types.ObjectId(faker.database.mongodbObjectId()),
      };
      const mockRefreshToken = faker.internet.jwt({ payload: payload });
      mockJwtService.sign.mockReturnValue(mockRefreshToken);

      const refreshToken = authService.generateRefreshToken(payload);

      expect(mockJwtService.sign).toHaveBeenCalledWith(payload, {
        secret: mockConfigService.getOrThrow<string>(
          'JWT_SECRET_REFRESH_TOKEN',
        ),
        expiresIn: mockConfigService.getOrThrow<string>(
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
        .mockImplementationOnce(() => Promise.resolve('hashedPassword'));

      const hashedText = await authService.hash(plainText);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        plainText,
        Number(mockConfigService.getOrThrow<string>('HASH_SALT')),
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
        .mockImplementationOnce(() => Promise.resolve(true));

      const isMatch = await authService.compareHash(plainText, hashedText);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainText, hashedText);
      expect(isMatch).toBe(true);
    });

    it('should return false if not match', async () => {
      const plainText = 'password';
      const hashedText = 'wrongHashed';
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementationOnce(() => Promise.resolve(false));

      const isMatch = await authService.compareHash(plainText, hashedText);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainText, hashedText);
      expect(isMatch).toBe(false);
    });
  });

  describe('signup', () => {
    it('should successfully create a new user', async () => {
      const signupDto: SignupAuthDto = {
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: generateStrongPassword(),
      };

      const hashedPassword = 'hashed' + signupDto.password;

      const mockCreatedUser = generateUser(false);
      mockCreatedUser.username = signupDto.username;
      mockCreatedUser.email = signupDto.email;

      authService.hash = jest.fn().mockResolvedValueOnce(hashedPassword);
      mockUserService.createUser.mockResolvedValue({ ...mockCreatedUser });

      const createdUser = await authService.signup(signupDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        username: signupDto.username,
        email: signupDto.email,
        hashedPassword: hashedPassword,
      });
      expect(createdUser).toEqual(mockCreatedUser);
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens on successful login', async () => {
      const password = generateStrongPassword();
      const loginDto: LoginAuthDto = {
        username: faker.internet.username(),
        password: password,
      };

      const user: User = generateUser();
      user.username = loginDto.username!;

      const storedPassword = 'hashed' + password;
      const jwtPayload: JwtPayload = { sub: user._id };
      const mockTokens = {
        accessToken: faker.internet.jwt(),
        refreshToken: faker.internet.jwt(),
      };

      mockUserService.findUser.mockResolvedValue({ ...user });
      mockUserService.getUserPassword.mockResolvedValue(storedPassword);
      authService.compareHash = jest.fn().mockResolvedValueOnce(true);
      authService.generateAccessToken = jest
        .fn()
        .mockReturnValueOnce(mockTokens.accessToken);
      authService.generateRefreshToken = jest
        .fn()
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await authService.login(loginDto);

      expect(mockUserService.findUser).toHaveBeenCalledWith({
        username: loginDto.username,
        email: undefined,
      });
      expect(mockUserService.getUserPassword).toHaveBeenCalledWith(user._id);
      expect(authService.compareHash).toHaveBeenCalledWith(
        loginDto.password,
        storedPassword,
      );
      expect(authService.generateAccessToken).toHaveBeenCalledWith(jwtPayload);
      expect(authService.generateRefreshToken).toHaveBeenCalledWith(jwtPayload);
      expect(result).toEqual(mockTokens);
    });

    it('should throw BadRequestException for incorrect password', async () => {
      const password = generateStrongPassword();
      const loginDto: LoginAuthDto = {
        username: faker.internet.username(),
        password: password,
      };

      const user: User = generateUser();
      user.username = loginDto.username!;

      const storedPassword = 'hashed' + password;

      mockUserService.findUser.mockResolvedValue({ ...user });
      mockUserService.getUserPassword.mockResolvedValue(storedPassword);
      authService.compareHash = jest.fn().mockResolvedValueOnce(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new BadRequestException('Password is incorrect'),
      );
      expect(mockUserService.findUser).toHaveBeenCalledWith({
        username: loginDto.username,
        email: undefined,
      });
      expect(mockUserService.getUserPassword).toHaveBeenCalledWith(user._id);
      expect(authService.compareHash).toHaveBeenCalledWith(
        loginDto.password,
        storedPassword,
      );
    });

    it('should throw BadRequestException for unverified email', async () => {
      const password = generateStrongPassword();
      const loginDto: LoginAuthDto = {
        username: faker.internet.username(),
        password: password,
      };

      const user: User = generateUser(false);
      user.username = loginDto.username!;

      mockUserService.findUser.mockResolvedValue({ ...user });
      mockUserService.getUserPassword.mockResolvedValue(password);
      authService.compareHash = jest.fn().mockResolvedValueOnce(true);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new BadRequestException('Please verify your email before logging in'),
      );
      expect(mockUserService.findUser).toHaveBeenCalledWith({
        username: loginDto.username,
        email: undefined,
      });
    });
  });

  describe('changePassword', () => {
    it('should change the password successfully', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());
      const password = generateStrongPassword();
      const newPassword = generateStrongPassword();

      const changePasswordDto: ChangePasswordAuthDto = {
        password: password,
        newPassword: newPassword,
      };

      const storedPassword = 'hashed' + password;
      const newHashedPassword = 'hashed' + newPassword;

      mockUserService.getUserPassword.mockResolvedValue(storedPassword);
      authService.compareHash = jest.fn().mockResolvedValueOnce(true);
      authService.hash = jest.fn().mockResolvedValueOnce(newHashedPassword);
      mockUserService.resetUserPassword.mockResolvedValue(undefined);

      await authService.changePassword(id, changePasswordDto);

      expect(mockUserService.getUserPassword).toHaveBeenCalledWith(id);
      expect(authService.compareHash).toHaveBeenCalledWith(
        changePasswordDto.password,
        storedPassword,
      );
      expect(authService.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
      );
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      const id = new Types.ObjectId(faker.database.mongodbObjectId());
      const password = generateStrongPassword();
      const newPassword = generateStrongPassword();

      const changePasswordDto: ChangePasswordAuthDto = {
        password: password,
        newPassword: newPassword,
      };

      const storedPassword = 'hashed' + password;

      mockUserService.getUserPassword.mockResolvedValue(storedPassword);
      authService.compareHash = jest.fn().mockResolvedValueOnce(false);

      await expect(
        authService.changePassword(id, changePasswordDto),
      ).rejects.toThrow(new BadRequestException('Password is incorrect'));
      expect(mockUserService.getUserPassword).toHaveBeenCalledWith(id);
      expect(authService.compareHash).toHaveBeenCalledWith(
        changePasswordDto.password,
        storedPassword,
      );
    });
  });
});
