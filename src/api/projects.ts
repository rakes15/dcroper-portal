import { apiClient } from './client';

export interface Project {
  id: string;
  name: string;
  description: string;
  config_json: string;
  status: string;
  created_at: string;
  updated_at: string;
  survey_count?: number;
}

export interface ProjectInput {
  name: string;
  description?: string;
  geometry_type?: string;
  accuracy_threshold?: number;
  max_images?: number;
}

export const getProjects = (includeArchived = false) =>
  apiClient
    .get<{ data: Project[] }>('/projects', { params: includeArchived ? { include_archived: 'true' } : {} })
    .then((r) => ({ ...r, data: r.data.data }));

export const getProject = (id: string) => apiClient.get<Project>(`/projects/${id}`);

export const createProject = (data: ProjectInput) => apiClient.post<{ id: string }>('/projects', data);

export const updateProject = (id: string, data: Partial<ProjectInput>) =>
  apiClient.put(`/projects/${id}`, data);

export const archiveProject = (id: string) => apiClient.delete(`/projects/${id}`);
