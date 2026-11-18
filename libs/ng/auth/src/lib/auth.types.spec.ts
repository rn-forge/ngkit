// internal imports
import {
  AllowAnyPermission,
  AnonymousCredentials,
  SessionCredentials,
} from './auth.types';

describe('credentials', () => {
  it('uses session permissions only, never role names or attributes', () => {
    const session = {
      subject: 'ada',
      provider: 'development',
      roles: ['admin'],
      permissions: ['items.read'],
      attributes: { permissions: ['hidden'] },
      expiresAt: '2099-01-01T00:00:00Z',
    };
    const credentials = new SessionCredentials(session);
    expect(credentials.isAuthenticated).toBe(true);
    expect(credentials.session).toBe(session);
    expect(credentials.roles).toEqual(['admin']);
    expect(credentials.hasPermission('items.read')).toBe(true);
    expect(credentials.hasPermission('admin')).toBe(false);
    expect(credentials.hasPermission('hidden')).toBe(false);
    expect(credentials.hasAnyPermission('admin', 'items.read')).toBe(true);
    expect(credentials.hasAnyPermission('admin', 'hidden')).toBe(false);
    expect(credentials.hasAnyPermission()).toBe(false);
  });
  it('denies everything anonymously', () => {
    const credentials = new AnonymousCredentials();
    expect(credentials.isAuthenticated).toBe(false);
    expect(credentials.session).toBeNull();
    expect(credentials.roles).toEqual([]);
    expect(credentials.hasPermission('x')).toBe(false);
    expect(credentials.hasAnyPermission('x', 'y')).toBe(false);
    expect(credentials.hasAnyPermission()).toBe(false);
  });
  it('keeps the allow-any policy', () => {
    const policy = new AllowAnyPermission();
    expect(policy.hasPermission('x')).toBe(true);
    expect(policy.hasAnyPermission()).toBe(true);
  });
});
