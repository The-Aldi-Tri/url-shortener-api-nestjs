import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class UpdateUserAuthDto {
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
}
