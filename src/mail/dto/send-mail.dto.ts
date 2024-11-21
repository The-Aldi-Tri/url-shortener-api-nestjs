import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendMailDto {
  @ApiProperty({
    description: 'E-mail address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}
