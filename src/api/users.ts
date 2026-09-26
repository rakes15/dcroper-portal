import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  role: string;
  username?: string;
  mobile?: string;
}

export const getUsers = () => apiClient.get<User[]>('/users');
