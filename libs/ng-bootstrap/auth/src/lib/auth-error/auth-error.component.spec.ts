// external imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

// internal imports
import { DEFAULT_AUTH_CONFIG, RNF_AUTH_CONFIG_TOKEN } from '@rn-forge/ng/auth';
import { provideRnForgeAuthTesting } from '@rn-forge/ng/auth/testing';
import { RN_FORGE_APP_CONFIG_TOKEN, RouteService } from '@rn-forge/ng/core';
import { AuthErrorComponent } from './auth-error.component';

describe('AuthErrorComponent', () => {
  let fixture: ComponentFixture<AuthErrorComponent>;
  let route: { queryParams: Record<string, string> };

  beforeEach(async () => {
    route = { queryParams: {} };
    await TestBed.configureTestingModule({
      imports: [AuthErrorComponent],
      providers: [
        provideRnForgeAuthTesting(null),
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
        { provide: RouteService, useValue: route },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  function render() {
    fixture = TestBed.createComponent(AuthErrorComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    [
      'access_denied',
      'Sign-in was cancelled or refused by the identity provider.',
    ],
    [
      'account_not_provisioned',
      'You signed in, but this application has no account for you. Contact your administrator.',
    ],
    ['login_failed', 'Sign-in could not be completed. Please try again.'],
    [
      'session_not_established',
      'Sign-in completed, but no session was established. Check that this site may set cookies, then try again.',
    ],
  ])('renders the exact message for %s', (error, message) => {
    route.queryParams = { error };
    const page = render();
    expect(page.querySelector('h1')?.textContent?.trim()).toBe(
      'Sign-in problem',
    );
    expect(page.querySelector('p')?.textContent?.trim()).toBe(message);
  });

  it.each(['<script>x</script>', undefined])(
    'renders unknown without exposing %s',
    (error) => {
      route.queryParams = error === undefined ? {} : { error };
      const page = render();
      expect(page.querySelector('p')?.textContent?.trim()).toBe(
        'Sign-in failed for an unknown reason. Please try again.',
      );
      expect(page.textContent).not.toContain('<script>x</script>');
      expect(page.querySelector('script')).toBeNull();
    },
  );

  it('links back to the default login path', () => {
    const link = render().querySelector('a');
    expect(link?.textContent?.trim()).toBe('Back to sign in');
    expect(link?.getAttribute('href')).toBe('/login');
  });

  it('links back to the configured login path', () => {
    TestBed.overrideProvider(RNF_AUTH_CONFIG_TOKEN, {
      useValue: { ...DEFAULT_AUTH_CONFIG, loginPath: '/signin' },
    });
    expect(render().querySelector('a')?.getAttribute('href')).toBe('/signin');
  });
});
