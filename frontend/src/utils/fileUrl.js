import { API_BASE_URL } from '../config';

export const getFileUrl = (path) => {
  if (!path) return '';
  // If the path contains localhost:3001, strip it out to make it relative
  let cleanPath = path;
  if (cleanPath.includes('http://localhost:3001')) {
    cleanPath = cleanPath.replace(/http:\/\/localhost:3001/g, '');
  }
  
  // If it's already an absolute URL (other than localhost), return it
  if (cleanPath.startsWith('http')) return cleanPath;
  
  // In development, API_BASE_URL might be http://localhost:3001/api
  // We need to serve from http://localhost:3001/uploads/...
  if (API_BASE_URL.startsWith('http')) {
    const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
    return `${baseUrl}${cleanPath}`;
  }
  
  // In production, it's just a relative path, so return it directly
  return cleanPath;
};
