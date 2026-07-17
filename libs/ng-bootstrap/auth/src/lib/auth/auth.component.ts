// external imports
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { Validators } from '@angular/forms';

// internal imports
import {
  AuthBackendService,
  AuthFrontendConfig,
  AuthService,
  LoginResponse,
  RNF_AUTH_CONFIG_TOKEN,
  RnForgeAuthConfig,
} from '@rn-forge/ng/auth';
import { GenericType, RouteService } from '@rn-forge/ng/core';
import { AlertComponent } from '@rn-forge/ng-bootstrap';
import { AbstractAuthPage } from '../abstract-auth-page';
import { ConfigOptions } from '@rn-forge/ng-bootstrap';
import { STYLE } from '@rn-forge/ng-bootstrap';
import {
  DropdownFieldComponent,
  FormComponent,
  FormOptions,
} from '@rn-forge/ng-bootstrap/form';

// config options
export interface AuthOptions extends ConfigOptions {
  errorStyle: STYLE;
  userType?: {
    label: string;
    value: string;
  };
  users: GenericType[];
}

// component definition
@Component({
  selector: 'rnf-auth',
  imports: [AlertComponent, FormComponent, DropdownFieldComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent extends AbstractAuthPage<AuthOptions> {
  private readonly routeService = inject(RouteService);
  private readonly document = inject(DOCUMENT);
  private readonly authConfig?: AuthFrontendConfig = inject<RnForgeAuthConfig>(
    RNF_AUTH_CONFIG_TOKEN,
  ).frontend;
  private readonly authService: AuthService = inject(AuthService);
  private readonly authBackendService: AuthBackendService =
    inject(AuthBackendService);

  private mode: 'login' | 'logout' = 'login';
  private returnUrl = '';

  protected authError: WritableSignal<string | undefined> = signal<
    string | undefined
  >(undefined);

  @ViewChild('loginForm') private loginForm!: FormComponent;

  override ngOnInit(): void {
    super.ngOnInit();
    this.mode = this.routeService.queryParams['mode'] ?? 'login';
    this.returnUrl = this.routeService.queryParams['returnUrl'] || '';
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    if (this.mode === 'logout') {
      this.doLogout();
      const userMenuEl = this.document.getElementById('userMenu');
      if (userMenuEl) {
        userMenuEl.classList.remove('show');
        userMenuEl.classList.add('hide');
      }
    } else if (this.isAuthenticated) {
      this.routeService.navigateByUrl(this.returnUrl);
    }
  }

  login(): void {
    this.authBackendService
      .login(this.loginForm.rawValue['user'] as string)
      .subscribe({
        next: (response: LoginResponse) => {
          this.loginSuccess(response.access_token);
        },
        error: (err: HttpErrorResponse) => {
          this.loginError(
            'There was an error during login. Please try again or contact support.',
            err.error?.message ?? 'Unknown error',
          );
        },
      });
  }

  private loginSuccess(tokenStr: string): void {
    const jwtToken = this.authService.login(tokenStr);
    if (!jwtToken) {
      this.loginError(
        'There was an error during login. Please try again or contact support.',
        'Invalid Token',
      );
    } else if (
      this.authConfig?.audience &&
      jwtToken.audience !== this.authConfig.audience
    ) {
      this.loginError(
        'User does not have access to this application. Please contact support.',
        `Audience: ${this.authConfig.audience} | Profile: ${JSON.stringify(jwtToken)}`,
      );
    } else if (
      this.authConfig?.permissions &&
      !this.authService.hasAnyPermission(...this.authConfig.permissions)
    ) {
      this.loginError(
        'User does not have access to this application. Please contact support.',
        `Permissions: ${this.authConfig.permissions} | Profile: ${JSON.stringify(jwtToken)}`,
      );
    } else {
      this.routeService.navigateByUrl(this.returnUrl);
    }
  }

  private loginError(alertMessage: string, errorMessage: string): void {
    this.alert?.error(alertMessage);
    this.authError.set(errorMessage ?? 'Unknown Error');
    console.error(`Login Error: ${this.authError()}`);
    this.loginForm?.enable();
    this.authService.logout();
  }

  private doLogout(): void {
    this.authService.logout();
    this.authBackendService.logout().subscribe({
      next: () => {
        this.alert?.success('You have been logged out successfully');
      },
      error: (response: HttpErrorResponse) => {
        super.handleErrorResponse(
          response,
          'Error during logout, try signing in again',
        );
      },
    });
  }

  protected loginFormOptions: FormOptions = {
    header: 'Login',
    controls: {
      user: ['', [Validators.required]],
    },
    cancelBtn: false,
    submitBtn: 'Login',
  };

  override configKey = 'auth';

  override defaultOptions(): Partial<AuthOptions> {
    return {
      errorStyle: 'warning',
      userType: { label: 'name', value: 'email' },
      users: [],
    };
  }
}
