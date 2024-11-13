import { OmitType, PartialType } from '@nestjs/swagger';
import { IsDefined, ValidateIf } from 'class-validator';
import { SignupAuthDto } from '../../auth/dto/signup-auth.dto';

export class UpdateUserAuthDto extends PartialType(
  OmitType(SignupAuthDto, ['password'] as const),
) {
  @ValidateIf((o) => !o.username && !o.email)
  @IsDefined({
    message: 'Please provide at least one data to update (username or email)',
  })
  protected readonly atLeastOne?: undefined;
}
