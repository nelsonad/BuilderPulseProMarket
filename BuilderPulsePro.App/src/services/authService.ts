import {requestEmpty, requestJson} from './apiClient';

type AuthResponse = {
  accessToken: string;
  expires: string;
};

export const login = async (email: string, password: string) =>
  requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password}),
  });

export const register = async (email: string, password: string) =>
  requestEmpty('/auth/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password}),
  });

export const confirmEmail = async (userId: string, token: string) =>
  requestEmpty(
    `/auth/confirm-email?userId=${encodeURIComponent(
      userId,
    )}&token=${encodeURIComponent(token)}`,
  );
