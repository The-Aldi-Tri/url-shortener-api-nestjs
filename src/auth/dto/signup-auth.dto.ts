import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsStrongPassword, Matches } from 'class-validator';

export class SignupAuthDto {
  @ApiProperty({
    description:
      'Username (only support letters[A-Za-z], numbers[0-9], hyphens[-], underscores[_] and dot [.]',
    pattern: '/^[A-Za-z0-9-_.]{3,30}$/',
    example: 'user123',
  })
  @Matches(/^[A-Za-z0-9-_.]{3,30}$/, {
    message:
      'Username must contain only letters, numbers, hyphens, underscores and dot',
  })
  username: string;

  @ApiProperty({
    description: 'E-mail address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Password with minLength 8, minLowercase 1, minUppercase 1, minNumbers 1, and minSymbols 1,',
    minLength: 8,
    example: 'StrongPa5$',
  })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;
}
