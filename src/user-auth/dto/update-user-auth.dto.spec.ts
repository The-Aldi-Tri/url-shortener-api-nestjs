import { validate } from 'class-validator';
import { UpdateUserAuthDto } from './update-user-auth.dto';

describe('UpdateUserAuthDto', () => {
  it('should validate a valid username', async () => {
    const dto = new UpdateUserAuthDto();
    dto.username = 'validUser123';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate a valid email', async () => {
    const dto = new UpdateUserAuthDto();
    dto.email = 'test@example.com';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate both username and email', async () => {
    const dto = new UpdateUserAuthDto();
    dto.username = 'validUser123';
    dto.email = 'test@example.com';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should return an error if neither username nor email is provided', async () => {
    const dto = new UpdateUserAuthDto();

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isDefined');
  });

  it('should return an error if username is invalid', async () => {
    const dto = new UpdateUserAuthDto();
    dto.username = 'invalid user!'; // Invalid due to spaces and special characters

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('matches');
  });

  it('should return an error if email is invalid', async () => {
    const dto = new UpdateUserAuthDto();
    dto.email = 'invalid-email'; // Invalid email format

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });
});
