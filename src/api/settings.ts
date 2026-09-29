import { apiClient } from './client';

export type AppSettings = {
  org_name: string;
  org_contact_email: string;
  timezone: string;
  require_approval: string;
  auto_reject_days: string;
  allow_draft_edit: string;
  sync_interval_minutes: string;
  tile_cache_days: string;
  push_notifications_enabled: string;
  notification_sound: string;
  default_export_format: string;
  survey_retention_days: string;
}

export const getSettings = () => apiClient.get<AppSettings>('/settings');
export const updateSettings = (data: Partial<AppSettings>) =>
  apiClient.put<AppSettings>('/settings', data);
