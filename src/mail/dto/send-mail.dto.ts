import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class SendMailDto {
  @ApiProperty({
    description:
      'Username (only support letters[A-Za-z], numbers[0-9], hyphens[-], underscores[_] and dot [.]',
    minLength: 3,
    maxLength: 30,
    pattern: '/^[A-Za-z0-9-_.]{3,30}$/',
    example: 'user123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[A-Za-z0-9-_.]{3,30}$/, {
    message:
      'Username must contain only letters, numbers, hyphens, underscores and dot',
  })
  username: string;

  @ApiProperty({
    description: 'E-mail address',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
