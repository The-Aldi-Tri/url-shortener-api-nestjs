import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class UpdateUserAuthDto {
  @ApiProperty({
    description:
      'Username (only support letters[A-Za-z], numbers[0-9], hyphens[-], underscores[_] and dot [.]',
    minLength: 3,
    maxLength: 30,
    pattern: '/^[A-Za-z0-9-_.]+$/',
    example: 'user123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[A-Za-z0-9-_.]+$/, {
    message:
      'Username must contain only letters, numbers, hyphens, underscores and dot',
  })
  username: string;
}
