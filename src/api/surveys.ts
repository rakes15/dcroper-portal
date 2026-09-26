import { apiClient } from './client';

export interface Survey {
  id: string;
  project_id: string;
  user_id: string;
  status: string;
  form_response: string;
  geometry_type: string;
  geometry_data: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export const getSurveys = (params?: { project_id?: string; user_id?: string; status?: string }) =>
  apiClient.get<Survey[]>('/surveys', { params });

export const getSurvey = (id: string) =>
  apiClient.get<Survey>(`/surveys/${id}`);

export const deleteSurvey = (id: string) =>
  apiClient.delete(`/surveys/${id}`);
