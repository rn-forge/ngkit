// external imports
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

// internal imports
import {
  FakeAuthService,
  provideRnForgeAuthTesting,
} from '@rn-forge/ng/auth/testing';
import { RN_FORGE_APP_CONFIG_TOKEN, RouteService } from '@rn-forge/ng/core';
import { ForbiddenComponent } from './forbidden.component';

describe('ForbiddenComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent],
      providers: [
        provideRnForgeAuthTesting({
          subject: 'ada',
          provider: 'password',
          roles: [],
          permissions: [],
          expiresAt: '2099-01-01T00:00:00Z',
        }),
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
        { provide: RouteService, useValue: { queryParams: {} } },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('shows access denied and a home link without offering or starting login', () => {
    const auth = TestBed.inject(FakeAuthService);
    const startLogin = vi.spyOn(auth, 'startLogin');
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Access denied');
    expect(page.querySelector('p')?.textContent?.trim()).toBe(
      'You are signed in, but you do not have permission to view this page.',
    );
    const link = page.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Go to the home page');
    expect(link?.getAttribute('href')).toBe('/');
    expect(page.querySelector('a[href="/login"]')).toBeNull();
    expect(page.textContent).not.toMatch(/sign in/i);
    expect(auth.logins).toEqual([]);
    expect(startLogin).not.toHaveBeenCalled();
  });
});
