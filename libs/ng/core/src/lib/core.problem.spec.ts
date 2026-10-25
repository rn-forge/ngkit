import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  httpResource,
  provideHttpClient,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  hasProblemType,
  PROBLEM_MEDIA_TYPE,
  problemMessage,
  problemOf,
  problemTypeOf,
} from './core.problem';

const problemHeaders = { 'Content-Type': PROBLEM_MEDIA_TYPE };

const failure = (
  status: number,
  error: unknown,
  contentType: string | null = PROBLEM_MEDIA_TYPE,
  url?: string,
) =>
  new HttpErrorResponse({
    status,
    error,
    url,
    headers: contentType
      ? new HttpHeaders({ 'Content-Type': contentType })
      : undefined,
  });

describe('problemOf', () => {
  it('returns the body of an application/problem+json error', () => {
    const body = { title: 'Not Found', status: 404 };
    expect(problemOf(failure(404, body))).toBe(body);
  });

  it('ignores case and media type parameters', () => {
    const body = { title: 't' };
    expect(
      problemOf(failure(400, body, 'Application/Problem+JSON; charset=utf-8')),
    ).toBe(body);
  });

  it('returns undefined for anything that is not a problem', () => {
    const body = { title: 't', detail: 'd' };
    expect(problemOf(failure(400, body, 'application/json'))).toBeUndefined();
    expect(problemOf(failure(400, body, null))).toBeUndefined();
    expect(problemOf(failure(400, 'text'))).toBeUndefined();
    expect(problemOf(failure(400, null))).toBeUndefined();
    expect(problemOf(failure(400, ['a']))).toBeUndefined();
    expect(problemOf(failure(400, new Blob(['x'])))).toBeUndefined();
    expect(problemOf(body)).toBeUndefined();
    expect(problemOf(new Error('x'))).toBeUndefined();
    expect(problemOf(undefined)).toBeUndefined();
  });

  it('types extension members without a cast', () => {
    const error = failure(422, { errors: [{ detail: 'bad' }] });
    const errors = problemOf<{
      errors: { pointer?: string; detail: string }[];
    }>(error)?.errors;
    expect(errors?.[0].detail).toBe('bad');
  });
});

describe('problemMessage', () => {
  it('gives the detail of a problem', () => {
    expect(
      problemMessage(
        failure(404, { title: 'Not Found', detail: 'No track 7' }),
      ),
    ).toBe('No track 7');
  });

  it('gives the title when there is no detail', () => {
    expect(problemMessage(failure(500, { title: 'Server error' }))).toBe(
      'Server error',
    );
  });

  it('uses the fallback for a problem with neither', () => {
    expect(problemMessage(failure(500, {}))).toBe('Request failed (500)');
  });

  it('does not treat an application/json body as a problem', () => {
    expect(
      problemMessage(failure(404, { detail: 'x' }, 'application/json')),
    ).toBe('Request failed (404)');
  });

  it('falls back for a plain-text 502 and a network failure', () => {
    expect(problemMessage(failure(502, 'Bad Gateway', 'text/plain'))).toBe(
      'Request failed (502)',
    );
    expect(problemMessage(failure(0, new ProgressEvent('error'), null))).toBe(
      'Request failed (0)',
    );
  });

  it('uses a custom fallback', () => {
    expect(
      problemMessage(failure(503, 'x', 'text/plain'), (s) => `Oops ${s}`),
    ).toBe('Oops 503');
  });

  it('gives an Error its message and anything else its string', () => {
    expect(problemMessage(new Error('boom'))).toBe('boom');
    expect(problemMessage(undefined)).toBe('undefined');
  });
});

describe('problemTypeOf and hasProblemType', () => {
  const url = 'https://host/v1/tracks/1';

  it('resolves a relative type against the response url', () => {
    const error = failure(404, { type: '/problems/x' }, undefined, url);
    expect(problemTypeOf(error)).toBe('https://host/problems/x');
    expect(hasProblemType(error, '/problems/x')).toBe(true);
    expect(hasProblemType(error, 'https://host/problems/x')).toBe(true);
    expect(hasProblemType(error, '/problems/y')).toBe(false);
  });

  it('returns an absolute type as given', () => {
    const error = failure(
      404,
      { type: 'https://example.com/probs/out-of-credit' },
      undefined,
      url,
    );
    expect(problemTypeOf(error)).toBe(
      'https://example.com/probs/out-of-credit',
    );
    expect(
      hasProblemType(error, 'https://example.com/probs/out-of-credit'),
    ).toBe(true);
  });

  it('is about:blank when the type is absent', () => {
    const error = failure(404, { title: 't' }, undefined, url);
    expect(problemTypeOf(error)).toBe('about:blank');
    expect(hasProblemType(error, 'about:blank')).toBe(true);
  });

  it('compares the raw strings with no url', () => {
    const error = failure(404, { type: '/problems/x' });
    expect(problemTypeOf(error)).toBe('/problems/x');
    expect(hasProblemType(error, '/problems/x')).toBe(true);
    expect(hasProblemType(error, 'https://host/problems/x')).toBe(false);
  });

  it('never throws on an invalid type', () => {
    const error = failure(404, { type: 'http://' }, undefined, url);
    expect(problemTypeOf(error)).toBe('http://');
    expect(hasProblemType(error, 'http://')).toBe(true);
    expect(hasProblemType(error, 'x')).toBe(false);
  });

  it('is undefined and false for a non-problem', () => {
    const error = failure(404, { type: '/p' }, 'application/json', url);
    expect(problemTypeOf(error)).toBeUndefined();
    expect(hasProblemType(error, '/p')).toBe(false);
    expect(hasProblemType(new Error('x'), 'about:blank')).toBe(false);
  });
});

describe('problem helpers with Angular HTTP', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const notFound = {
    type: '/problems/track-missing',
    title: 'Not Found',
    detail: 'No track 7',
  };
  const init = {
    status: 404,
    statusText: 'Not Found',
    headers: problemHeaders,
  };

  it('reads httpResource().error()', async () => {
    const resource = httpResource(() => '/v1/tracks/7', {
      injector: TestBed.inject(Injector),
    });
    TestBed.tick();
    http.expectOne('/v1/tracks/7').flush(notFound, init);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(problemMessage(resource.error())).toBe('No track 7');
    expect(hasProblemType(resource.error(), '/problems/track-missing')).toBe(
      true,
    );
  });

  it('reads the error of an HttpClient call', () => {
    let caught: unknown;
    TestBed.inject(HttpClient)
      .get('/v1/tracks/7')
      .subscribe({ error: (e: unknown) => (caught = e) });
    http.expectOne('/v1/tracks/7').flush(notFound, init);

    expect(caught).toBeInstanceOf(HttpErrorResponse);
    expect(problemMessage(caught)).toBe('No track 7');
    expect(hasProblemType(caught, '/problems/track-missing')).toBe(true);
  });
});
