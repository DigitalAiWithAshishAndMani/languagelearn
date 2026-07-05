import { apiRequest } from './client';
import type { User, TokenResponse } from '../types';

export async function registerUser(name: string, email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginUser(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<User> {
  return apiRequest<User>('/auth/me');
}
