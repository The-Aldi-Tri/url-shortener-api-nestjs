import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, Matches } from 'class-validator';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The original url (only support http and https protocol).',
    example: 'https://google.com',
  })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  origin: string;

  @ApiProperty({
    description: 'The shorten url.',
    pattern: '/^[A-Za-z0-9-_.]{3,30}$/',
    example: 'abc',
  })
  @Matches(/^[A-Za-z0-9-_.]{3,30}$/, {
    message:
      'shorten must contain only letters, numbers, hyphens, underscores and dot',
  })
  shorten: string;
}
