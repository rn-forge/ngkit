// external imports
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';

// internal imports
import { RNF_AUTH_CONFIG_TOKEN } from './auth.config';
import {
  AnonymousCredentials,
  Credentials,
  Session,
  SessionCredentials,
} from './auth.types';

/** Fetches the backend session and exposes the current reactive credentials. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RNF_AUTH_CONFIG_TOKEN);
  private readonly currentCredentials = signal<Credentials>(
    new AnonymousCredentials(),
  );
  /** Readonly reactive identity, initially anonymous. */
  readonly credentials: Signal<Credentials> =
    this.currentCredentials.asReadonly();

  /** Fetch and emit credentials; a 401 becomes anonymous, while other errors pass through. */
  refresh(): Observable<Credentials> {
    return this.http.get<Session>(this.config.sessionUrl).pipe(
      map((session): Credentials => new SessionCredentials(session)),
      catchError((error: HttpErrorResponse) =>
        error.status === 401
          ? of(new AnonymousCredentials())
          : throwError(() => error),
      ),
      tap((credentials) => this.currentCredentials.set(credentials)),
    );
  }
}
