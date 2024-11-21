import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsEmail,
  IsMongoId,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';

export class GetUnverifiedUserDto {
  @ApiProperty({
    description:
      'Username (only support letters[A-Za-z], numbers[0-9], hyphens[-], underscores[_] and dot [.]',
    pattern: '/^[A-Za-z0-9-_.]{3,30}$/',
    example: 'user123',
    required: false,
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

  @ApiProperty({
    description: 'The user ID (MongoDB ObjectId)',
    example: new Types.ObjectId(),
    required: false,
  })
  @ValidateIf((o) => o.userId)
  @IsMongoId()
  userId?: Types.ObjectId;

  @ValidateIf((o) => !o.email && !o.username && !o.userId)
  @IsDefined({ message: 'Provide at least one, user ID or email or username' })
  protected readonly atLeastOne?: undefined;
}
