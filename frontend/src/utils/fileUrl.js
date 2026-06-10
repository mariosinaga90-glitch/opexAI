import { API_BASE_URL } from '../config';

export const getFileUrl = (path) => {
  if (!path) return '';
  // If the path contains localhost:3001, strip it out to make it relative
  let cleanPath = path;
  if (cleanPath.includes('http://localhost:3001')) {
    cleanPath = cleanPath.replace(/http:\/\/localhost:3001/g, '');
  }
  
  // Clean up any double slashes in the path just in case
  cleanPath = cleanPath.replace(/\/\//g, '/');
  
  // If it's already an absolute URL (other than localhost), return it
  if (cleanPath.startsWith('http')) return cleanPath;
  
  // If API_BASE_URL is absolute (e.g. https://domain.com or https://domain.com/api)
  if (API_BASE_URL.startsWith('http')) {
    try {
      const url = new URL(API_BASE_URL);
      // Always serve from the root origin (e.g., https://domain.com/uploads/...)
      return `${url.origin}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
    } catch (e) {
      // Fallback below
    }
  }
  
  // For relative API_BASE_URL (like /api), return the clean path
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
};
