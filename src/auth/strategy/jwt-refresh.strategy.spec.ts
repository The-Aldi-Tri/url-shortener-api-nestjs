import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../type/JwtPayload.type';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  let jwtStrategy: JwtRefreshStrategy;
  let userService: UserService;

  const mockUserService = {
    checkUserExist: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test_secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    jwtStrategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
    userService = module.get<UserService>(UserService);
  });

  describe('validate', () => {
    it('should return user id when user exists', async () => {
      const payload: JwtPayload = { sub: new Types.ObjectId() };
      mockUserService.checkUserExist.mockResolvedValue(true);

      const result = await jwtStrategy.validate(payload);
      expect(result).toEqual({ id: payload.sub });
      expect(userService.checkUserExist).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      const payload: JwtPayload = { sub: new Types.ObjectId() };
      mockUserService.checkUserExist.mockResolvedValue(false); // Mock user non-existence

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
