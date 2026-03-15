import { SubAppDefinition } from '../types';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://playground-api-dyu9.onrender.com/api/v1';

export async function fetchSubApps(): Promise<SubAppDefinition[]> {
  const response = await fetch(`${API_BASE_URL}/sub_apps`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
  return data.sub_apps;
}
