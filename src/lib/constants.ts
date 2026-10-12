import type { ProjectType } from '@/types';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  'website': 'Sito Web',
  'web-app': 'App Web',
  'landing-page': 'Landing Page',
  'ecommerce': 'E-commerce',
  'dashboard': 'Dashboard',
  'portfolio': 'Portfolio',
  'blog': 'Blog',
  'other': 'Altro',
};

export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  'website': 'Globe',
  'web-app': 'AppWindow',
  'landing-page': 'LayoutTemplate',
  'ecommerce': 'ShoppingCart',
  'dashboard': 'LayoutDashboard',
  'portfolio': 'FolderOpen',
  'blog': 'FileText',
  'other': 'Sparkles',
};

export const PROJECT_TYPES: ProjectType[] = [
  'website',
  'web-app',
  'landing-page',
  'ecommerce',
  'dashboard',
  'portfolio',
  'blog',
  'other',
];

export const PROJECT_TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  'website': 'Sito informativo con più pagine',
  'web-app': 'Applicazione web interattiva',
  'landing-page': 'Pagina singola promozionale',
  'ecommerce': 'Negozio online con prodotti',
  'dashboard': 'Pannello di controllo con dati',
  'portfolio': 'Mostra i tuoi progetti e competenze',
  'blog': 'Piattaforma per articoli e contenuti',
  'other': 'Qualcos\'altro di personalizzato',
};

export const AI_PROVIDERS = [
  {
    id: 'managed' as const,
    name: 'Proxy Backend Gestito (Senza chiave)',
    models: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'],
    defaultEndpoint: '/api/ai/generate',
    docsUrl: '',
  },
  {
    id: 'gemini' as const,
    name: 'Google Gemini (BYOK)',
    models: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'],
    defaultEndpoint: 'https://generativelanguage.googleapis.com',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'openai' as const,
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic' as const,
    name: 'Anthropic (Claude)',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'groq' as const,
    name: 'Groq',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defaultEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    docsUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'custom' as const,
    name: 'Endpoint personalizzato',
    models: [],
    defaultEndpoint: '',
    docsUrl: '',
  },
];

export const STORAGE_KEYS = {
  PROJECTS: 'ai-app-builder:projects',
  SETTINGS: 'ai-app-builder:settings',
  ACTIVITY_LOGS: 'ai-app-builder:activity-logs',
  PENDING_PLAN: 'ai-app-builder:pending-plan',
};
