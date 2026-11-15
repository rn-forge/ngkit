// external imports
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

// internal imports
import {
  AuthProvider,
  AuthService,
  PasswordLoginError,
} from '@rn-forge/ng/auth';
import { RouteService } from '@rn-forge/ng/core';
import { ConfigOptions } from '@rn-forge/ng-bootstrap';
import { AbstractAuthPage } from '../abstract-auth-page';

/** Login page offering backend providers and local password sign-in. */
@Component({
  selector: 'rnf-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent extends AbstractAuthPage<ConfigOptions> {
  private readonly auth = inject(AuthService);
  private readonly route = inject(RouteService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private returnTo = '/';

  override configKey = 'login';
  readonly providers = signal<readonly AuthProvider[]>([]);
  readonly hasPassword = signal(false);
  readonly pending = signal(false);
  readonly message = signal('');
  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  override ngOnInit(): void {
    super.ngOnInit();
    const returnTo = this.route.queryParams['returnTo'];
    if (
      returnTo?.startsWith('/') &&
      returnTo[1] !== '/' &&
      returnTo[1] !== '\\'
    ) {
      this.returnTo = returnTo;
    }
    if (this.isAuthenticated) {
      void this.router.navigateByUrl(this.returnTo);
      return;
    }
    this.auth
      .providers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (providers) => {
          const navigating = providers.filter((provider) =>
            ['oidc', 'oauth2', 'development'].includes(provider.kind),
          );
          this.hasPassword.set(
            providers.some((provider) => provider.kind === 'password'),
          );
          if (navigating.length === 1 && !this.hasPassword()) {
            this.login(navigating[0].id);
          } else {
            this.providers.set(navigating);
          }
        },
        error: () => this.showError(),
      });
  }

  login(provider: string): void {
    this.auth.login(provider, this.returnTo);
  }

  submit(): void {
    if (this.form.invalid || this.pending()) return;
    this.message.set('');
    this.pending.set(true);
    const { username, password } = this.form.getRawValue();
    this.auth
      .loginWithPassword(username, password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(this.returnTo),
        error: (error) => this.showError(error),
      });
  }

  private showError(error?: unknown): void {
    this.message.set(
      error instanceof PasswordLoginError
        ? error.reason === 'invalid-credentials'
          ? 'Sign-in failed. Check your username and password.'
          : 'Too many sign-in attempts. Try again later.'
        : 'Sign-in is unavailable right now. Try again later.',
    );
  }
}
