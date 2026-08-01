import { TestBed } from '@angular/core/testing';
import { AbstractConstructor } from '@rn-forge/ng/core';
import { authComponentMixin } from './auth.mixins';
import { AuthService } from './auth.services';
import { UserProfile } from './auth.types';

abstract class TestBase {}

function makeConcreteComponent(mockAuthService: Partial<AuthService>) {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: mockAuthService }],
  });

  class Concrete extends authComponentMixin(
    TestBase as unknown as AbstractConstructor,
  ) {}

  return TestBed.runInInjectionContext(() => new Concrete());
}

describe('authComponentMixin', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exposes the injected AuthService', () => {
    const mockAuthService = {} as Partial<AuthService>;
    const component = makeConcreteComponent(mockAuthService);
    expect(component.authService).toBe(mockAuthService);
  });

  it('userProfile falls back to an empty object when the service has none', () => {
    const component = makeConcreteComponent({
      userProfile: undefined,
    });
    expect(component.userProfile).toEqual({});
  });

  it('userProfile returns the service value when present', () => {
    const profile = { id: 1, email: 'a@b.com' } as unknown as UserProfile;
    const component = makeConcreteComponent({ userProfile: profile });
    expect(component.userProfile).toBe(profile);
  });

  it('isAuthenticated delegates to the service', () => {
    const component = makeConcreteComponent({ isAuthenticated: true });
    expect(component.isAuthenticated).toBe(true);
  });

  it('userHasPermission delegates to the service', () => {
    const hasPermission = vi.fn().mockReturnValue(true);
    const component = makeConcreteComponent({ hasPermission });
    expect(component.userHasPermission('edit')).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith('edit');
  });

  it('userHasAnyPermission delegates to the service', () => {
    const hasAnyPermission = vi.fn().mockReturnValue(false);
    const component = makeConcreteComponent({ hasAnyPermission });
    expect(component.userHasAnyPermission('a', 'b')).toBe(false);
    expect(hasAnyPermission).toHaveBeenCalledWith('a', 'b');
  });
});
