// external imports
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// internal imports
import { RNF_CREDENTIALS, RNF_PERMISSION } from './auth.config';
import { authComponentMixin } from './auth.mixins';
import {
  AnonymousCredentials,
  Credentials,
  SessionCredentials,
} from './auth.types';

abstract class TestBase {}

describe('authComponentMixin', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('reads the session and delegates permissions to the policy', () => {
    const credentials = signal<Credentials>(new AnonymousCredentials());
    const policy = {
      hasPermission: vi.fn().mockReturnValue(true),
      hasAnyPermission: vi.fn().mockReturnValue(false),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: RNF_CREDENTIALS, useValue: credentials },
        { provide: RNF_PERMISSION, useValue: policy },
      ],
    });
    class Concrete extends authComponentMixin(TestBase) {}
    const component = TestBed.runInInjectionContext(() => new Concrete());
    expect(component.session).toBeNull();
    expect(component.isAuthenticated).toBe(false);
    const session = {
      subject: 'ada',
      provider: 'development',
      roles: [],
      permissions: [],
      expiresAt: '2099-01-01T00:00:00Z',
    };
    credentials.set(new SessionCredentials(session));
    expect(component.session).toBe(session);
    expect(component.isAuthenticated).toBe(true);
    expect(component.userHasPermission('read')).toBe(true);
    expect(policy.hasPermission).toHaveBeenCalledWith('read');
    expect(component.userHasAnyPermission('read', 'write')).toBe(false);
    expect(policy.hasAnyPermission).toHaveBeenCalledWith('read', 'write');
  });
});
