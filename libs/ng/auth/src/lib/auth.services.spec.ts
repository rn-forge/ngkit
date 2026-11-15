// external imports
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

// internal imports
import { provideRnForgeAuth } from './auth.providers';
import { AuthService } from './auth.services';
import {
  AnonymousCredentials,
  Session,
  SessionCredentials,
} from './auth.types';

const session: Session = {
  subject: 'ada',
  provider: 'development',
  roles: ['admin'],
  permissions: ['items.read'],
  expiresAt: '2099-01-01T00:00:00Z',
};

describe('session bootstrap and refresh', () => {
  let controller: HttpTestingController;
  let service: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideRnForgeAuth(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    navigate = vi.spyOn(router, 'navigate');
    navigateByUrl = vi.spyOn(router, 'navigateByUrl');
  });
  afterEach(() => {
    expect(navigate).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    controller.verify();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });
  it.each([200, 401, 500])(
    'starts without navigation on %s',
    async (status) => {
      const log = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const init = TestBed.inject(ApplicationInitStatus);
      const request = controller.expectOne('/auth/session');
      expect(request.request.method).toBe('GET');
      request.flush(status === 200 ? session : {}, {
        status,
        statusText: 'test',
      });
      await init.donePromise;
      expect(service.credentials()).toBeInstanceOf(
        status === 200 ? SessionCredentials : AnonymousCredentials,
      );
      if (status === 200) {
        expect(service.credentials().roles).toEqual(session.roles);
        expect(service.credentials().hasPermission('items.read')).toBe(true);
        expect(service.credentials().session).toEqual(session);
      }
      if (status === 500) {
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0][0]).toMatch(/^\[rn-forge\.ng\.auth\]/);
      } else expect(log).not.toHaveBeenCalled();
    },
  );
  it('refresh emits and updates credentials for 200 and 401', () => {
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const next = vi.fn();
    service.refresh().subscribe(next);
    controller.expectOne('/auth/session').flush(session);
    expect(next).toHaveBeenLastCalledWith(service.credentials());
    expect(service.credentials()).toBeInstanceOf(SessionCredentials);
    service.refresh().subscribe(next);
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(next).toHaveBeenLastCalledWith(service.credentials());
    expect(service.credentials()).toBeInstanceOf(AnonymousCredentials);
  });
  it('passes non-401 refresh errors to the caller', () => {
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const error = vi.fn();
    service.refresh().subscribe({ error });
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 }),
    );
  });
});
