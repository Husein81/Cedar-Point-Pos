import crypto from 'crypto';

export const generateToken = (): string => {
  return crypto.randomBytes(24).toString('hex');
};
