import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsDefined, IsEmail, Matches, ValidateIf } from 'class-validator';
import { SignupAuthDto } from './signup-auth.dto';

export class LoginAuthDto extends PickType(SignupAuthDto, [
  'password',
] as const) {
  @ApiProperty({
    description:
      'Username (only support letters[A-Za-z], numbers[0-9], hyphens[-], underscores[_] and dot [.]',
    pattern: '/^[A-Za-z0-9-_.]{3,30}$/',
    required: false,
    example: 'user123',
  })
  @ValidateIf((o) => o.username)
  @Matches(/^[A-Za-z0-9-_.]{3,30}$/, {
    message:
      'Username must contain only letters, numbers, hyphens, underscores and dot',
  })
  username?: string;

  @ApiProperty({
    description: 'E-mail address',
    example: 'user@example.com',
    required: false,
  })
  @ValidateIf((o) => o.email)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => (!o.email && !o.username) || (o.email && o.username))
  @IsDefined({ message: 'Provide either email or username, not both' })
  protected readonly exactlyOne?: undefined;
}
