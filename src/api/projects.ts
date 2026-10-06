import { apiClient } from './client';

export interface Project {
  id: string;
  name: string;
  description: string;
  config_json: string;
  status: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  survey_count?: number;
  state_ids?: string[];
  state_names?: string[];
  district_ids?: string[];
  district_names?: string[];
  season_ids?: string[];
  season_names?: string[];
  crop_ids?: string[];
  crop_names?: string[];
}

export interface ProjectInput {
  name: string;
  description?: string;
  geometry_type?: string;
  accuracy_threshold?: number;
  max_images?: number;
  block_mock_location?: boolean;
  initial_status?: string;
  state_ids?: string[];
  district_ids?: string[];
  season_ids?: string[];
  crop_ids?: string[];
}

export interface StatusHistoryEntry {
  id: string;
  project_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_by_name: string;
  note: string | null;
  created_at: string;
}

export const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived', 'cancelled'] as const;
export type ProjectStatus = typeof STATUSES[number];

export const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string; icon: string }> = {
  planning:  { label: 'Planning',   color: '#4f46e5', bg: '#eef2ff', icon: '📐' },
  active:    { label: 'Active',     color: '#059669', bg: '#d1fae5', icon: '✅' },
  on_hold:   { label: 'On Hold',    color: '#d97706', bg: '#fef3c7', icon: '⏸' },
  completed: { label: 'Completed',  color: '#2563eb', bg: '#dbeafe', icon: '🏁' },
  archived:  { label: 'Archived',   color: '#6b7280', bg: '#f3f4f6', icon: '🗄' },
  cancelled: { label: 'Cancelled',  color: '#dc2626', bg: '#fee2e2', icon: '✗' },
};

export const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  planning:  ['active', 'cancelled'],
  active:    ['on_hold', 'completed', 'archived', 'cancelled'],
  on_hold:   ['active', 'cancelled'],
  completed: ['archived'],
  archived:  [],
  cancelled: [],
};

export const getProjects = (params?: { status?: string; include_archived?: boolean }) =>
  apiClient
    .get<{ data: Project[] }>('/projects', {
      params: {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.include_archived ? { include_archived: 'true' } : {}),
      },
    })
    .then((r) => ({ ...r, data: r.data.data }));

export const getProject = (id: string) => apiClient.get<Project>(`/projects/${id}`);

export const createProject = (data: ProjectInput) => apiClient.post<{ id: string }>('/projects', data);

export const updateProject = (id: string, data: Partial<ProjectInput>) =>
  apiClient.put(`/projects/${id}`, data);

export const setProjectStatus = (id: string, status: string, note?: string) =>
  apiClient.patch(`/projects/${id}/status`, { status, note });

export const getProjectHistory = (id: string) =>
  apiClient.get<StatusHistoryEntry[]>(`/projects/${id}/history`);

export const archiveProject = (id: string) => apiClient.delete(`/projects/${id}`);

export interface ProjectAssignment {
  id: string;
  name: string;
  mobile: string;
  role: string;
  assigned_at: string;
}

export const getProjectAssignments = (projectId: string) =>
  apiClient.get<ProjectAssignment[]>(`/projects/${projectId}/assignments`);

export const assignUserToProject = (projectId: string, userId: string) =>
  apiClient.post(`/projects/${projectId}/assignments`, { user_id: userId });

export const unassignUserFromProject = (projectId: string, userId: string) =>
  apiClient.delete(`/projects/${projectId}/assignments/${userId}`);
