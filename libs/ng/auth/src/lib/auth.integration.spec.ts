// external imports
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

// internal imports
import { RNF_CREDENTIALS, RNF_PERMISSION } from './auth.config';
import { provideRnForgeAuth } from './auth.providers';
import { AuthService } from './auth.services';

describe('session permission wiring', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('follows refreshed session permissions', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRnForgeAuth(),
      ],
    });
    const permission = TestBed.inject(RNF_PERMISSION);
    const service = TestBed.inject(AuthService);
    const controller = TestBed.inject(HttpTestingController);
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(TestBed.inject(RNF_CREDENTIALS)).toBe(service.credentials);
    expect(permission.hasPermission('items.read')).toBe(false);
    service.refresh().subscribe();
    controller.expectOne('/auth/session').flush({
      subject: 'ada',
      provider: 'development',
      roles: ['admin'],
      permissions: ['items.read'],
      expiresAt: '2099-01-01T00:00:00Z',
    });
    expect(permission.hasPermission('items.read')).toBe(true);
    expect(permission.hasAnyPermission('missing', 'items.read')).toBe(true);
    expect(permission.hasPermission('admin')).toBe(false);
    service.refresh().subscribe();
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(permission.hasPermission('items.read')).toBe(false);
    controller.verify();
  });
});
