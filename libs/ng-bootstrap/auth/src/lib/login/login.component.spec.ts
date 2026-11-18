// external imports
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

// internal imports
import { Credentials, PasswordLoginError } from '@rn-forge/ng/auth';
import {
  FakeAuthService,
  provideRnForgeAuthTesting,
} from '@rn-forge/ng/auth/testing';
import { RN_FORGE_APP_CONFIG_TOKEN, RouteService } from '@rn-forge/ng/core';
import { LoginComponent } from './login.component';

const WORKSPACE = { id: 'oidc-id', name: 'Workspace', kind: 'oidc' } as const;
const DEV = { id: 'dev', name: 'Dev', kind: 'development' } as const;
const PASSWORD = {
  id: 'password',
  name: 'Password',
  kind: 'password',
} as const;
const UNAVAILABLE = 'Sign-in is unavailable right now. Try again later.';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: FakeAuthService;
  let navigate: ReturnType<typeof vi.spyOn>;
  let route: { queryParams: Record<string, string> };

  beforeEach(async () => {
    route = { queryParams: { returnTo: '/orders' } };
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRnForgeAuthTesting(null),
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
        { provide: RouteService, useValue: route },
      ],
    });
    auth = TestBed.inject(FakeAuthService);
    navigate = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
  });

  afterEach(() => TestBed.resetTestingModule());

  const buttons = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
  const alertText = () =>
    fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim();
  function submit() {
    for (const [name, value] of [
      ['username', 'ada'],
      ['password', 'pw'],
    ]) {
      const input = fixture.nativeElement.querySelector(
        `[formControlName="${name}"]`,
      ) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('redirects signed-in users without fetching providers', () => {
    auth.setSession({
      subject: 'ada',
      provider: 'password',
      roles: [],
      permissions: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });
    const providers = vi.spyOn(auth, 'providers');
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/orders');
    expect(providers).not.toHaveBeenCalled();
  });

  it('renders navigating provider names and starts the selected login', () => {
    auth.setProviders([WORKSPACE, DEV]);
    fixture.detectChanges();
    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      'Workspace',
      'Dev',
    ]);
    buttons()[0].click();
    expect(auth.logins).toEqual([{ provider: 'oidc-id', returnTo: '/orders' }]);
  });

  it('automatically starts a sole navigating provider without a button', () => {
    auth.setProviders([WORKSPACE]);
    fixture.detectChanges();
    expect(auth.logins).toEqual([{ provider: 'oidc-id', returnTo: '/orders' }]);
    expect(buttons()).toHaveLength(0);
  });

  it('offers a navigating provider and password form without automatic login', () => {
    auth.setProviders([WORKSPACE, PASSWORD]);
    fixture.detectChanges();
    expect(
      buttons()
        .filter((button) => button.type === 'button')
        .map((button) => button.textContent?.trim()),
    ).toEqual(['Workspace']);
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    expect(auth.logins).toEqual([]);
  });

  it('submits a password and navigates on success', () => {
    auth.setProviders([PASSWORD]);
    const login = vi
      .spyOn(auth, 'loginWithPassword')
      .mockReturnValue(of(auth.credentials()));
    fixture.detectChanges();
    submit();
    expect(login).toHaveBeenCalledWith('ada', 'pw');
    expect(navigate).toHaveBeenCalledWith('/orders');
  });

  it('shows a generic invalid credentials message without revealing accounts', () => {
    auth.setProviders([PASSWORD]);
    vi.spyOn(auth, 'loginWithPassword').mockReturnValue(
      throwError(() => new PasswordLoginError('invalid-credentials')),
    );
    fixture.detectChanges();
    submit();
    expect(alertText()).toBe(
      'Sign-in failed. Check your username and password.',
    );
    expect(fixture.nativeElement.textContent).not.toMatch(/exist|not found/i);
  });

  it.each([
    [
      new PasswordLoginError('rate-limited'),
      'Too many sign-in attempts. Try again later.',
    ],
    [new HttpErrorResponse({ status: 500 }), UNAVAILABLE],
  ])('shows the password failure message for %s', (error, message) => {
    auth.setProviders([PASSWORD]);
    vi.spyOn(auth, 'loginWithPassword').mockReturnValue(
      throwError(() => error),
    );
    fixture.detectChanges();
    submit();
    expect(alertText()).toBe(message);
  });

  it('shows unavailable when providers fail', () => {
    vi.spyOn(auth, 'providers').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    fixture.detectChanges();
    expect(alertText()).toBe(UNAVAILABLE);
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', ''])(
    'falls back to root for unsafe returnTo %s',
    (returnTo) => {
      route.queryParams = { returnTo };
      auth.setProviders([WORKSPACE, DEV]);
      fixture.detectChanges();
      buttons()[0].click();
      expect(auth.logins).toEqual([{ provider: 'oidc-id', returnTo: '/' }]);
    },
  );

  it('requires both fields and disables submit while a password login is pending', () => {
    auth.setProviders([PASSWORD]);
    const pending = new Subject<Credentials>();
    const login = vi.spyOn(auth, 'loginWithPassword').mockReturnValue(pending);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit'));
    expect(login).not.toHaveBeenCalled();
    submit();
    expect(button.disabled).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    pending.next(auth.credentials());
    pending.complete();
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/orders');
  });
});
