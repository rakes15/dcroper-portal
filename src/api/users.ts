import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: string;
  created_at?: string;
}

export interface UserInput {
  name: string;
  mobile: string;
  password?: string;
  role: string;
}

export const getUsers = () => apiClient.get<User[]>('/users');
export const createUser = (data: UserInput) => apiClient.post<User>('/users', data);
export const updateUser = (id: string, data: Partial<UserInput>) => apiClient.put(`/users/${id}`, data);
export const deleteUser = (id: string) => apiClient.delete(`/users/${id}`);
