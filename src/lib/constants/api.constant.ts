// Project mode
export const PROJECT_MODE = process.env.NEXT_PUBLIC_PROJECT_MODE || 'development';

// Backend URLs
export const BACKEND_DEV_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5033';
export const BACKEND_STAGE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_STAGE || '';
export const BACKEND_PROD_URL = process.env.NEXT_PUBLIC_API_BASE_URL_PROD || '';

// Determine backend URL based on project mode
export let BACKEND_SERVER_URL: string;

switch (PROJECT_MODE) {
  case 'development':
    BACKEND_SERVER_URL = BACKEND_DEV_URL;
    break;
  case 'stage':
    BACKEND_SERVER_URL = BACKEND_STAGE_URL || BACKEND_DEV_URL;
    break;
  case 'production':
    BACKEND_SERVER_URL = BACKEND_PROD_URL || BACKEND_DEV_URL;
    break;
  default:
    BACKEND_SERVER_URL = BACKEND_DEV_URL;
    break;
}

// Token storage key
export const TOKEN_STORAGE_KEY = 'appUser';

