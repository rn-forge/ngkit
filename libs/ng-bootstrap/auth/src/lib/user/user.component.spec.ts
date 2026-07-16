import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { RN_FORGE_AUTH_CONFIG_TOKEN } from '@rn-forge/ng/auth';
import { UserComponent } from './user.component';

const AUTH_CONFIG = {
  frontend: { disableAuth: true, loginPath: '/auth', ignoreAppRoutes: [] },
  backend: { ignoreBackendURLs: [] },
};

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
      providers: [
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
        { provide: RN_FORGE_AUTH_CONFIG_TOKEN, useValue: AUTH_CONFIG },
      ],
    });
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "user"', () => {
    expect(component.configKey).toBe('user');
  });
});
