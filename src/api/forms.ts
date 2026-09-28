import { apiClient } from './client';

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'image';
  label: string;
  required: boolean;
  options: string[];
  hint: string;
  image_source: 'both' | 'camera' | 'gallery';
}

export interface FormDefinition {
  id?: string;
  version?: number;
  fields: FormField[];
  conditions: unknown[];
}

export const getProjectForm = (projectId: string) =>
  apiClient.get<FormDefinition>(`/projects/${projectId}/form`);

export const saveProjectForm = (projectId: string, fields: FormField[]) =>
  apiClient.post<{ id: string; version: number }>(`/projects/${projectId}/form`, { fields, conditions: [] });
