import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  IsDefined,
  IsString,
  IsStrongPassword,
  ValidateIf,
} from 'class-validator';
import { SignupAuthDto } from './signup-auth.dto';

export class ChangePasswordAuthDto extends PickType(SignupAuthDto, [
  'password',
] as const) {
  @ApiProperty({
    description:
      'New password with minLength 8, minLowercase 1, minUppercase 1, minNumbers 1, minSymbols 1, must be different from previous',
    minLength: 8,
    example: 'StrongPa5$1',
  })
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword: string;

  @ValidateIf((o) => o.password === o.newPassword)
  @IsDefined({ message: 'New password must be different from previous' })
  protected readonly differentPassword?: undefined;
}
