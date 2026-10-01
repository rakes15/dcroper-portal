import { apiClient } from './client';

export interface SurveyTemplate {
  id: string;
  name: string;
  project_id: string;
  form_values: Record<string, unknown>;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export const getTemplates = (projectId?: string) =>
  apiClient.get<SurveyTemplate[]>('/survey-templates', {
    params: projectId ? { project_id: projectId } : undefined,
  });

export const createTemplate = (data: {
  name: string;
  project_id: string;
  form_values: Record<string, unknown>;
}) => apiClient.post<SurveyTemplate>('/survey-templates', data);

export const deleteTemplate = (id: string) =>
  apiClient.delete<{ deleted: boolean }>(`/survey-templates/${id}`);
