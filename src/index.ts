// Main exports for programmatic usage
export { APIClient } from './api/client.js';
export { getConfig, setConfig, isAuthenticated } from './config/loader.js';
export { detectFramework, getAdapter, listAdapters } from './adapters/index.js';
export type { ExclusionConfig, BaseAdapter } from './adapters/base.js';
export type * from './types/config.js';
