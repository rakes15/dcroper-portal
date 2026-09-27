import { apiClient } from './client';

// Shape returned by GET /surveys (list)
export interface Survey {
  id: string;
  project_id: string;
  user_id: string;
  status: string;
  form_response_json: string;
  geometry: string;
  geometry_type: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

// Shape returned by GET /surveys/:id (detail — geometry and form_response are pre-parsed)
export interface SurveyDetail {
  id: string;
  project_id: string;
  user_id: string;
  status: string;
  form_response: Record<string, unknown>;
  geometry: Record<string, unknown>;
  geometry_type: string;
  accuracy: number | null;
  created_at: string;
  updated_at: string;
}

export const getSurveys = (params?: { project_id?: string; user_id?: string; status?: string }) =>
  apiClient.get<Survey[]>('/surveys', { params });

export const getSurvey = (id: string) =>
  apiClient.get<SurveyDetail>(`/surveys/${id}`);

export const deleteSurvey = (id: string) =>
  apiClient.delete(`/surveys/${id}`);
