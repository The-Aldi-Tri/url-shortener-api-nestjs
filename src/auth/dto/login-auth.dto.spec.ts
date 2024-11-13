import { validate } from 'class-validator';
import { LoginAuthDto } from './login-auth.dto';

describe('LoginAuthDto', () => {
  it('should validate a valid username and password', async () => {
    const dto = new LoginAuthDto();
    dto.username = 'validUser123';
    dto.password = 'StrongP@ss1';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate a valid email and password', async () => {
    const dto = new LoginAuthDto();
    dto.email = 'test@example.com';
    dto.password = 'StrongP@ss1';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should return an error if both email and username are provided', async () => {
    const dto = new LoginAuthDto();
    dto.username = 'validUser123';
    dto.email = 'test@example.com';
    dto.password = 'StrongP@ss1';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isDefined');
  });

  it('should return an error if neither email nor username is provided', async () => {
    const dto = new LoginAuthDto();
    dto.password = 'StrongP@ss1';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isDefined');
  });

  it('should return an error if username is invalid', async () => {
    const dto = new LoginAuthDto();
    dto.username = 'invalid user!'; // Invalid due to spaces and special characters
    dto.password = 'StrongP@ss1';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('matches');
  });

  it('should return an error if password is not strong enough', async () => {
    const dto = new LoginAuthDto();
    dto.username = 'validUser123';
    dto.password = 'weakPass'; // Not strong enough

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isStrongPassword');
  });

  it('should return an error if password is empty', async () => {
    const dto = new LoginAuthDto();
    dto.username = 'validUser123';
    dto.password = ''; // Empty password

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isStrongPassword');
  });
});
