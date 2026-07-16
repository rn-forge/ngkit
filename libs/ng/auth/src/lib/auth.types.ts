// external imports
import { Signal, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { flatten, get, map, set, union, uniq } from 'lodash-es';

// internal imports
import { GenericType } from '@rn-forge/ng/core';

// type definitions
/** Shape of the JWT token pair returned by the login endpoint. */
export interface LoginResponse extends GenericType {
  readonly access_token: string;
  readonly refresh_token: string;
}

// ---------------------------------------------------------------------------
// Permission interface — authorization policy
// ---------------------------------------------------------------------------

/**
 * Authorisation policy contract. Implement this interface (or use one of the built-in
 * implementations) and provide it via `RNF_PERMISSION` to control what the authenticated
 * user may do.
 *
 * Built-in implementations: {@link AllowAnyPermission} (no-auth), and the internal
 * `CredentialPermission` wired by {@link provideRnForgeAuthConfig}.
 */
export interface Permission {
  hasPermission(key: string): boolean;
  hasAnyPermission(...keys: string[]): boolean;
}

// ---------------------------------------------------------------------------
// Credentials interface — user identity
// ---------------------------------------------------------------------------

/**
 * Shape of the user object embedded in the JWT `profile` claim.
 * All fields are readonly — the profile is derived from the token and never mutated locally.
 */
export interface UserProfile {
  readonly id: number;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly name: string;
  readonly role: string;
  readonly avatar: string;
  readonly is_staff: boolean;
  readonly is_superuser: boolean;
  readonly groups: {
    id: number;
    name: string;
    permissions: string[];
  }[];
  readonly permissions: string[];
  readonly status: string;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_by: string;
  readonly updated_at: string;
}

/**
 * User identity contract. Injected via `RNF_CREDENTIALS` as a `Signal<Credentials>`.
 *
 * Built-in implementations:
 * - {@link AnonymousCredentials} — default unauthenticated state
 * - {@link JwtCredentials} — populated after a successful JWT login
 */
export interface Credentials {
  readonly isAuthenticated: boolean;
  readonly userProfile: Signal<Partial<UserProfile>>;
  hasPermission(key: string): boolean;
  hasAnyPermission(...keys: string[]): boolean;
}

// ---------------------------------------------------------------------------
// AllowAnyPermission — no-auth policy (all checks pass)
// ---------------------------------------------------------------------------

/** {@link Permission} implementation that grants every permission check — the default when auth is disabled. */
export class AllowAnyPermission implements Permission {
  hasPermission(key: string): boolean {
    void key;
    return true;
  }

  hasAnyPermission(...keys: string[]): boolean {
    void keys;
    return true;
  }
}

// ---------------------------------------------------------------------------
// AnonymousCredentials — unauthenticated user identity (Django's AnonymousUser)
// ---------------------------------------------------------------------------

/** {@link Credentials} implementation representing an unauthenticated visitor. All permission checks return `false`. */
export class AnonymousCredentials implements Credentials {
  readonly isAuthenticated = false;
  readonly userProfile: Signal<Partial<UserProfile>> = signal({});

  hasPermission(key: string): boolean {
    void key;
    return false;
  }

  hasAnyPermission(...keys: string[]): boolean {
    void keys;
    return false;
  }
}

// ---------------------------------------------------------------------------
// JwtCredentials — authenticated user identity derived from JWT payload
// ---------------------------------------------------------------------------

/**
 * {@link Credentials} implementation for an authenticated JWT user.
 * Parses permissions from both top-level `permissions[]` and the union of each group's
 * `permissions[]` embedded in the JWT `profile` claim.
 */
export class JwtCredentials implements Credentials {
  readonly isAuthenticated = true;
  readonly userProfile: Signal<Partial<UserProfile>>;

  private readonly _permissions: string[];

  constructor(private readonly jwtToken: JwtToken) {
    const profile = jwtToken.getAttribute<UserProfile>('profile') ?? {};
    this.userProfile = signal(profile);
    this._permissions = uniq(
      union(
        (profile as UserProfile).permissions ?? [],
        flatten(map((profile as UserProfile).groups, 'permissions')),
      ),
    );
  }

  hasPermission(key: string): boolean {
    return this.hasAnyPermission(key);
  }

  hasAnyPermission(...keys: string[]): boolean {
    return this._permissions.some((p) => keys.includes(p));
  }
}

// ---------------------------------------------------------------------------
// JwtToken — raw JWT parsing and attribute access
// ---------------------------------------------------------------------------

/**
 * Decodes and wraps a raw JWT string, exposing standard claims as typed properties
 * and arbitrary payload attributes via `getAttribute()` / `setAttribute()`.
 *
 * Standard claim mapping:
 * | JWT claim   | Property   |
 * |-------------|------------|
 * | `token_type`| `type`     |
 * | `jti`       | `id`       |
 * | `iss`       | `issuer`   |
 * | `sub`       | `subject`  |
 * | `aud`       | `audience` |
 * | `exp`       | `expiry`   |
 * | `iat`       | `issuedAt` |
 */
export class JwtToken {
  private static _JWT_ATTRS: Record<string, string> = {
    token_type: 'type',
    jti: 'id',
    iss: 'issuer',
    sub: 'subject',
    aud: 'audience',
    exp: 'expiry',
    iat: 'issuedAt',
  };

  readonly token: string;
  readonly type!: string;
  readonly id!: string;
  readonly issuer!: string;
  readonly subject!: string;
  readonly audience!: string;
  readonly expiry!: number;
  readonly issuedAt!: string;

  constructor(token: string) {
    this.token = token;

    const payload = jwtDecode(token);
    Object.entries(payload).forEach((value: [string, unknown]) => {
      const mappedKey =
        value[0] in JwtToken._JWT_ATTRS
          ? JwtToken._JWT_ATTRS[value[0]]
          : value[0];
      set(this, mappedKey, value[1]);
    });

    this.audience = Array.isArray(this.audience)
      ? this.audience[0]
      : this.audience;
    this.expiry = Number(this.expiry) * 1000;
  }

  get isValid(): boolean {
    return this.expiry > Date.now();
  }

  getAttribute<T>(attr: string): T {
    return get(this, attr) as T;
  }

  setAttribute(attr: string, value: unknown): void {
    set(this, attr, value);
  }
}
