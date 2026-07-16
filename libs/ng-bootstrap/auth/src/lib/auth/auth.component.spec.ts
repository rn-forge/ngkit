import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { RN_FORGE_AUTH_CONFIG_TOKEN } from '@rn-forge/ng/auth';
import { AuthComponent } from './auth.component';

const AUTH_CONFIG = {
  frontend: { disableAuth: true, loginPath: '/auth', ignoreAppRoutes: [] },
  backend: { ignoreBackendURLs: [] },
};

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
        { provide: RN_FORGE_AUTH_CONFIG_TOKEN, useValue: AUTH_CONFIG },
      ],
    });
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('has configKey "auth"', () => {
    expect(component.configKey).toBe('auth');
  });
});
