import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../type/JwtPayload.type';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'myJwtRefresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET_REFRESH_TOKEN'),
    });
  }

  // same as verify callback in passport js
  async validate(payload: JwtPayload) {
    const id = payload.sub;
    const isUserExist = await this.userService.checkUserExist(id);
    if (!isUserExist) {
      throw new UnauthorizedException();
    }
    return { id };
  }
}
