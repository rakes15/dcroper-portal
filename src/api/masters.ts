import { apiClient } from './client';

export interface MasterState {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface MasterDistrict {
  id: string;
  name: string;
  state_id: string;
  state_name?: string;
  code: string | null;
  created_at: string;
}

export interface MasterSeason {
  id: string;
  name: string;
  created_at: string;
}

export interface MasterCrop {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface AllMasters {
  states: MasterState[];
  districts: MasterDistrict[];
  seasons: MasterSeason[];
  crops: MasterCrop[];
}

export const getAllMasters = () => apiClient.get<AllMasters>('/masters/all');

// States
export const getStates = () => apiClient.get<MasterState[]>('/masters/states');
export const createState = (data: { name: string; code?: string }) =>
  apiClient.post<MasterState>('/masters/states', data);
export const updateState = (id: string, data: { name: string; code?: string }) =>
  apiClient.put(`/masters/states/${id}`, data);
export const deleteState = (id: string) => apiClient.delete(`/masters/states/${id}`);

// Districts
export const getDistricts = (state_id?: string) =>
  apiClient.get<MasterDistrict[]>('/masters/districts', { params: state_id ? { state_id } : {} });
export const createDistrict = (data: { name: string; state_id: string; code?: string }) =>
  apiClient.post<MasterDistrict>('/masters/districts', data);
export const updateDistrict = (id: string, data: { name: string; state_id: string; code?: string }) =>
  apiClient.put(`/masters/districts/${id}`, data);
export const deleteDistrict = (id: string) => apiClient.delete(`/masters/districts/${id}`);

// Seasons
export const getSeasons = () => apiClient.get<MasterSeason[]>('/masters/seasons');
export const createSeason = (data: { name: string }) =>
  apiClient.post<MasterSeason>('/masters/seasons', data);
export const updateSeason = (id: string, data: { name: string }) =>
  apiClient.put(`/masters/seasons/${id}`, data);
export const deleteSeason = (id: string) => apiClient.delete(`/masters/seasons/${id}`);

// Crops
export const getCrops = () => apiClient.get<MasterCrop[]>('/masters/crops');
export const createCrop = (data: { name: string; category?: string }) =>
  apiClient.post<MasterCrop>('/masters/crops', data);
export const updateCrop = (id: string, data: { name: string; category?: string }) =>
  apiClient.put(`/masters/crops/${id}`, data);
export const deleteCrop = (id: string) => apiClient.delete(`/masters/crops/${id}`);
