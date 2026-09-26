import { apiClient } from './client';

export interface LoginResponse {
  token: string;
  user: { id: string; name: string; role: string; mobile: string };
}

export const login = (mobile: string, password: string) =>
  apiClient.post<LoginResponse>('/auth/login', { mobile, password });

export const changePassword = (old_password: string, new_password: string) =>
  apiClient.post('/auth/change-password', { old_password, new_password });
