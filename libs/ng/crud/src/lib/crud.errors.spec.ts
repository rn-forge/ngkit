import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  crudErrorKind,
  problemToFormErrors,
  SERVER_ERROR_KEY,
} from './crud.errors';

const problem = (body: unknown, status = 422) =>
  new HttpErrorResponse({
    status,
    error: body,
    headers: new HttpHeaders({ 'Content-Type': 'application/problem+json' }),
  });

const buildForm = () =>
  new FormGroup({
    name: new FormControl(''),
    'a/b': new FormControl(''),
    address: new FormGroup({ city: new FormControl('') }),
    items: new FormArray([
      new FormGroup({ qty: new FormControl(1) }),
      new FormGroup({ qty: new FormControl(2) }),
    ]),
  });

describe('problemToFormErrors', () => {
  it('maps top-level, nested and array-index pointers to controls', () => {
    const form = buildForm();
    const applied = problemToFormErrors(
      problem({
        title: 'Validation failed',
        errors: [
          { pointer: '/name', detail: 'required' },
          { pointer: '/name', detail: 'too short' },
          { pointer: '/address/city', detail: 'unknown city' },
          { pointer: '/items/1/qty', detail: 'must be positive' },
          { pointer: '/a~1b', detail: 'escaped' },
        ],
      }),
      form,
    );
    expect(applied).toBe(true);
    expect(form.get('name')?.errors).toEqual({
      [SERVER_ERROR_KEY]: ['required', 'too short'],
    });
    expect(form.get('name')?.touched).toBe(true);
    expect(form.get('address.city')?.errors).toEqual({
      [SERVER_ERROR_KEY]: ['unknown city'],
    });
    expect(form.get(['items', '1', 'qty'])?.errors).toEqual({
      [SERVER_ERROR_KEY]: ['must be positive'],
    });
    expect(form.get(['items', '0', 'qty'])?.errors).toBeNull();
    expect(form.get('a/b')?.errors).toEqual({
      [SERVER_ERROR_KEY]: ['escaped'],
    });
    expect(form.errors).toBeNull();
  });

  it('puts unmatched, missing and root pointers on the form', () => {
    const form = buildForm();
    problemToFormErrors(
      problem({
        errors: [
          { pointer: '/nope', detail: 'no such field' },
          { pointer: '/items/9/qty', detail: 'no such row' },
          { detail: 'no pointer' },
          { pointer: '', detail: 'whole body' },
        ],
      }),
      form,
    );
    expect(form.errors).toEqual({
      [SERVER_ERROR_KEY]: [
        'no such field',
        'no such row',
        'no pointer',
        'whole body',
      ],
    });
  });

  it('shows detail (else title) of a problem without errors on the form', () => {
    const withDetail = buildForm();
    problemToFormErrors(
      problem({ title: 'Conflict', detail: 'name taken' }),
      withDetail,
    );
    expect(withDetail.errors).toEqual({ [SERVER_ERROR_KEY]: ['name taken'] });

    const titleOnly = buildForm();
    problemToFormErrors(problem({ title: 'Unprocessable' }), titleOnly);
    expect(titleOnly.errors).toEqual({ [SERVER_ERROR_KEY]: ['Unprocessable'] });
  });

  it('reads the body of an HttpErrorResponse', () => {
    const form = buildForm();
    const error = problem({ errors: [{ pointer: '/name', detail: 'bad' }] });
    expect(problemToFormErrors(error, form)).toBe(true);
    expect(form.get('name')?.errors).toEqual({ [SERVER_ERROR_KEY]: ['bad'] });
  });

  it('ignores non-problem bodies and leaves the form untouched', () => {
    for (const body of [
      null,
      undefined,
      'oops',
      42,
      ['a'],
      { message: 'x' },
      { title: 'bare problem body', errors: [] },
      problem('<html>', 500),
    ]) {
      const form = buildForm();
      expect(problemToFormErrors(body, form)).toBe(false);
      expect(form.errors).toBeNull();
      expect(form.get('name')?.errors).toBeNull();
    }
  });

  it('ignores a 422 application/json body with errors', () => {
    const form = buildForm();
    const error = new HttpErrorResponse({
      status: 422,
      error: { errors: [{ pointer: '/name', detail: 'bad' }] },
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
    expect(problemToFormErrors(error, form)).toBe(false);
    expect(form.errors).toBeNull();
    expect(form.get('name')?.errors).toBeNull();
  });

  it('lets the server error clear on the control’s next validation', () => {
    const form = buildForm();
    problemToFormErrors(
      problem({ errors: [{ pointer: '/name', detail: 'bad' }] }),
      form,
    );
    form.get('name')?.setValue('fixed');
    expect(form.get('name')?.errors).toBeNull();
  });
});

describe('crudErrorKind', () => {
  const http = (status: number, error?: unknown, contentType?: string) =>
    new HttpErrorResponse({
      status,
      error,
      headers: contentType
        ? new HttpHeaders({ 'Content-Type': contentType })
        : undefined,
    });
  const asProblem = (status: number, error?: unknown) =>
    http(status, error, 'application/problem+json');

  it('classifies 412 as a conflict, other problem 4xx as problem', () => {
    expect(
      crudErrorKind(asProblem(412, { title: 'Precondition Failed' })),
    ).toBe('conflict');
    expect(crudErrorKind(http(412))).toBe('conflict');
    expect(crudErrorKind(asProblem(422, { errors: [] }))).toBe('problem');
    expect(crudErrorKind(asProblem(400, { detail: 'bad' }))).toBe('problem');
  });

  it('accepts a problem media type with parameters', () => {
    expect(
      crudErrorKind(
        http(422, { errors: [] }, 'application/problem+json; charset=utf-8'),
      ),
    ).toBe('problem');
  });

  it('treats everything else as other', () => {
    expect(crudErrorKind(asProblem(422, 'text'))).toBe('other');
    expect(crudErrorKind(asProblem(500, { title: 'boom' }))).toBe('other');
    expect(crudErrorKind(http(422, { errors: [] }, 'application/json'))).toBe(
      'other',
    );
    expect(crudErrorKind(http(422, { title: 'no header' }))).toBe('other');
    expect(crudErrorKind({ title: 'bare body' })).toBe('other');
    expect(crudErrorKind(new Error('x'))).toBe('other');
    expect(crudErrorKind(undefined)).toBe('other');
  });
});
