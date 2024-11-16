import { faker } from './faker';

export const generateStrongPassword = (length = 8) => {
  if (length < 8) {
    throw new Error('Strong password min length 8');
  }

  let password = '';

  password += faker.string.alpha({ casing: 'lower' });
  password += faker.string.alpha({ casing: 'upper' });
  password += faker.string.numeric();
  password += faker.string.symbol();

  password += faker.string.alphanumeric({ length: length - password.length });

  const passwordArr = faker.helpers.shuffle(password.split(''));

  return passwordArr.join('');
};
