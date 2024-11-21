import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsInt,
  IsMongoId,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';
export class VerifyMailDto {
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

  @ValidateIf((o) => !o.email && !o.userId)
  @IsDefined({ message: 'Provide at least email or user ID' })
  protected readonly atLeastOne?: undefined;

  @ApiProperty({
    description: 'A 6 digit verification code',
    minimum: 100000,
    maximum: 999999,
    example: 123456,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(100000)
  @Max(999999)
  verificationCode: number;
}
