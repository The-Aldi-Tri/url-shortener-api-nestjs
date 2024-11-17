import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyMailDto } from './verify-mail.dto';

describe('VerifyMailDto', () => {
  let dto: VerifyMailDto;

  it('should be valid when data is correct', async () => {
    const validData = {
      email: 'test@example.com',
      otp: '123456', // string input will be transformed into a number
    };

    dto = plainToInstance(VerifyMailDto, validData); // transform input to VerifyMailDto instance

    const errors = await validate(dto); // validate the instance
    expect(errors.length).toBe(0); // no validation errors
  });

  it('should be invalid when email is not a valid email', async () => {
    const invalidEmailData = {
      email: 'invalid-email',
      otp: '123456',
    };

    dto = plainToInstance(VerifyMailDto, invalidEmailData);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // expect validation errors
    expect(errors[0].property).toBe('email'); // check that email is the field with the error
  });

  it('should be invalid when OTP is not an integer', async () => {
    const invalidOtpData = {
      email: 'test@example.com',
      otp: 'not-a-number',
    };

    dto = plainToInstance(VerifyMailDto, invalidOtpData);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // expect validation errors
    expect(errors[0].property).toBe('otp'); // check that otp is the field with the error
  });

  it('should be invalid when OTP is less than the minimum value', async () => {
    const invalidOtpData = {
      email: 'test@example.com',
      otp: '99999', // less than the minimum of 100000
    };

    dto = plainToInstance(VerifyMailDto, invalidOtpData);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // expect validation errors
    expect(errors[0].property).toBe('otp'); // check that otp is the field with the error
  });

  it('should be invalid when OTP is greater than the maximum value', async () => {
    const invalidOtpData = {
      email: 'test@example.com',
      otp: '1000000', // greater than the maximum of 999999
    };

    dto = plainToInstance(VerifyMailDto, invalidOtpData);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0); // expect validation errors
    expect(errors[0].property).toBe('otp'); // check that otp is the field with the error
  });

  it('should transform OTP to a number correctly', async () => {
    const validData = {
      email: 'test@example.com',
      otp: '123456', // string input should be transformed to number
    };

    dto = plainToInstance(VerifyMailDto, validData);

    // Check if OTP is correctly transformed to a number
    expect(dto.otp).toBe(123456);
  });
});
