import { SubAppDefinition } from '../types';
import { API_BASE_URL } from '../config';

export async function fetchSubApps(): Promise<SubAppDefinition[]> {
  const response = await fetch(`${API_BASE_URL}/sub_apps`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
  return data.sub_apps;
}
