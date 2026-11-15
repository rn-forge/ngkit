// external imports
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

// internal imports
import {
  AnonymousCredentials,
  Credentials,
  RNF_CREDENTIALS,
  SessionCredentials,
} from '@rn-forge/ng/auth';
import { RN_FORGE_APP_CONFIG_TOKEN, RouteService } from '@rn-forge/ng/core';
import { AuthComponent } from './auth.component';

const SESSION = {
  subject: 'test',
  provider: 'development',
  roles: [],
  permissions: [],
  expiresAt: '2099-01-01T00:00:00Z',
};

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  const credentials = signal<Credentials>(new AnonymousCredentials());
  let routeService: {
    queryParams: Record<string, string>;
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    credentials.set(new AnonymousCredentials());
    routeService = { queryParams: {}, navigateByUrl: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
        { provide: RNF_CREDENTIALS, useValue: credentials },
        { provide: RouteService, useValue: routeService },
      ],
    });
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('shows the heading and alert without a login form when anonymous', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h4').textContent).toBe('Login');
    expect(fixture.nativeElement.querySelector('rnf-alert')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rnf-form')).toBeNull();
    expect(routeService.navigateByUrl).not.toHaveBeenCalled();
  });

  it('redirects an authenticated user to returnTo', () => {
    credentials.set(new SessionCredentials(SESSION));
    routeService.queryParams = { returnTo: '/dashboard' };
    fixture.detectChanges();
    expect(routeService.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('defaults an authenticated user redirect to root', () => {
    credentials.set(new SessionCredentials(SESSION));
    fixture.detectChanges();
    expect(routeService.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('has configKey "auth"', () => {
    expect(component.configKey).toBe('auth');
  });
});
