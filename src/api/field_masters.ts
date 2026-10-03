import { apiClient as client } from './client';

export interface FieldMaster {
  id: string;
  name: string;
  display_name: string;
  input_type: 'text' | 'number' | 'textarea' | 'dropdown' | 'image' | 'location' | 'date';
  data_type: 'text' | 'numeric' | 'alphanumeric' | null;
  input_length: number | null;
  allow_special_chars: boolean;
  validation_regex: string | null;
  options: string[];
  hint: string | null;
  image_source: 'camera' | 'gallery' | 'both';
  is_required_default: boolean;
  dependent_on_id: string | null;
  dependent_value: string[];
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export type FieldMasterInput = Omit<FieldMaster, 'id' | 'status' | 'created_at' | 'updated_at'>;

export const getFieldMasters = () =>
  client.get<FieldMaster[]>('/field-masters').then(r => r.data);

export const getFieldMaster = (id: string) =>
  client.get<FieldMaster>(`/field-masters/${id}`).then(r => r.data);

export const createFieldMaster = (data: FieldMasterInput) =>
  client.post<FieldMaster>('/field-masters', data).then(r => r.data);

export const updateFieldMaster = (id: string, data: Partial<FieldMasterInput> & { status?: string }) =>
  client.put<FieldMaster>(`/field-masters/${id}`, data).then(r => r.data);

export const archiveFieldMaster = (id: string) =>
  client.delete(`/field-masters/${id}`).then(r => r.data);
