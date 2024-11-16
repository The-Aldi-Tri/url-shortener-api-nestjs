import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, Length, Matches } from 'class-validator';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The original url (only support http and https protocol).',
    example: 'https://google.com',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  origin: string;

  @ApiProperty({
    description: 'The shorten url.',
    minLength: 3,
    maxLength: 30,
    pattern: '/^[A-Za-z0-9-_.]{3,30}$/',
    example: 'abc',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[A-Za-z0-9-_.]{3,30}$/, {
    message:
      'shorten must contain only letters, numbers, hyphens, underscores and dot',
  })
  shorten: string;
}
