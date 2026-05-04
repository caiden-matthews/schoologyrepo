// Test fixtures and helpers for OAuth testing
export const TEST_SCHOOLS = {
  schoolA: {
    name: 'shschools',
    domain: 'shschools.schoology.com',
    consumerKey: process.env.TEST_CONSUMER_KEY || 'test-key-a',
    consumerSecret: process.env.TEST_CONSUMER_SECRET || 'test-secret-a',
  },
  schoolB: {
    name: 'stuy',
    domain: 'stuy.schoology.com',
    consumerKey: process.env.TEST_CONSUMER_KEY || 'test-key-b',
    consumerSecret: process.env.TEST_CONSUMER_SECRET || 'test-secret-b',
  },
};

export const OAUTH_ENDPOINTS = {
  requestToken: '/api/auth',
  callback: '/api/callback',
  sync: '/api/sync',
};

// Mock OAuth state builder
export function buildOAuthState(schoolName) {
  return Buffer.from(JSON.stringify({
    school: schoolName,
    timestamp: Date.now(),
  })).toString('base64');
}

// Mock OAuth callback data
export function mockOAuthCallback(schoolName, accessToken = 'mock-access-token') {
  return {
    school: schoolName,
    sc_at: accessToken,
    sc_ats: `${accessToken}-secret`,
    sc_user: 'test-user-id',
  };
}

// Helper to parse URL hash parameters
export function parseHashParams(hash) {
  const params = new URLSearchParams(hash.replace('#', ''));
  return {
    sc_at: params.get('sc_at'),
    sc_ats: params.get('sc_ats'),
    sc_school: params.get('sc_school'),
    sc_user: params.get('sc_user'),
    oauth_error: params.get('oauth_error'),
  };
}

// Helper to simulate localStorage for testing
export class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}
