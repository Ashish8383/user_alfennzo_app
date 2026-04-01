import client from './client';

export const loginWithPhone = async (phone) => {
  const response = await client.post('/user/login', { phone });
  return response;
};

export const verifyOTP = async (phone, otp) => {
  const response = await client.post('/user/verifyOTP', { phone, otp });
  return response;
};