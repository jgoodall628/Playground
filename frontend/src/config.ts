const DEV_API_BASE = 'http://localhost:3000/api/v1';
const PROD_API_BASE = 'https://playground-api-dyu9.onrender.com/api/v1';

export const API_BASE_URL = __DEV__ ? DEV_API_BASE : PROD_API_BASE;

// Set via EAS environment variable (preview / production channels)
// Leave blank for local dev — backend allows unauthenticated writes when token is unset
export const API_WRITE_TOKEN = process.env.EXPO_PUBLIC_API_WRITE_TOKEN ?? '';
