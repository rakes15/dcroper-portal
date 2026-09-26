import { apiClient } from './client';

export interface Project {
  id: string;
  name: string;
  description: string;
  config: string;
  created_at: string;
  updated_at: string;
  survey_count?: number;
}

export const getProjects = () =>
  apiClient.get<{ data: Project[] }>('/projects').then((r) => ({ ...r, data: r.data.data }));

export const getProject = (id: string) => apiClient.get<Project>(`/projects/${id}`);
