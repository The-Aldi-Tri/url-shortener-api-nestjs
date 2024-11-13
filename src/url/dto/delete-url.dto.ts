import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class DeleteUrlDto {
  @ApiProperty({
    description: "The URL's ID(s) (MongoDB ObjectId) that you want to delete.",
    type: [String],
    minItems: 1,
    example: [new Types.ObjectId()],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  idsToDelete: Types.ObjectId[];
}
