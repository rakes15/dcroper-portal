import { apiClient } from './client';

// ── legacy inline field (still supported for read) ─────────────────────────
export interface FormField {
  id: string;
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'image' | 'location' | 'date';
  label: string;
  required: boolean;
  options: string[];
  hint: string;
  image_source: 'both' | 'camera' | 'gallery';
}

// ── new structured form ─────────────────────────────────────────────────────
export interface FieldRef {
  field_master_id: string;
  required?: boolean | null;
  display_name?: string | null;
}

export interface FormSection {
  id: string;
  label: string;
  field_refs: FieldRef[];
  fields?: FormField[];   // legacy
}

export interface FormTab {
  id: string;
  label: string;
  sections: FormSection[];
}

export interface FormDefinition {
  id?: string;
  version?: number;
  fields: FormField[];
  tabs: FormTab[];
  conditions: unknown[];
}

export const getProjectForm = (projectId: string) =>
  apiClient.get<FormDefinition>(`/projects/${projectId}/form`);

export const saveProjectForm = (
  projectId: string,
  tabs: FormTab[],
  fields: FormField[] = [],
) =>
  apiClient.post<{ id: string; version: number }>(`/projects/${projectId}/form`, {
    fields,
    tabs,
    conditions: [],
  });
