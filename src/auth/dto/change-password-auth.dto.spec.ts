import { validate } from 'class-validator';
import { ChangePasswordAuthDto } from './change-password-auth.dto';

describe('ChangePasswordAuthDto', () => {
  it('should validate a valid new password', async () => {
    const dto = new ChangePasswordAuthDto();
    dto.password = 'OldPassword1!';
    dto.newPassword = 'NewStrongP@ss1';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should return an error if new password is not strong enough', async () => {
    const dto = new ChangePasswordAuthDto();
    dto.password = 'OldPassword1!';
    dto.newPassword = 'weakPass'; // Not strong enough

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isStrongPassword');
  });

  it('should return an error if new password is the same as the old password', async () => {
    const dto = new ChangePasswordAuthDto();
    dto.password = 'OldPassword1!';
    dto.newPassword = 'OldPassword1!'; // Same as old password

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isDefined');
  });

  it('should return an error if new password is empty', async () => {
    const dto = new ChangePasswordAuthDto();
    dto.password = 'OldPassword1!';
    dto.newPassword = ''; // Empty new password

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isStrongPassword');
  });
});
