/** Readonly identity and permissions returned by the backend session endpoint. */
export interface Session {
  readonly subject: string;
  readonly name?: string;
  readonly email?: string;
  readonly picture?: string;
  readonly provider: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly authTime?: string;
  readonly amr?: readonly string[];
  readonly expiresAt: string;
}

/** Permission policy for individual or alternative permission keys. */
export interface Permission {
  hasPermission(key: string): boolean;
  hasAnyPermission(...keys: string[]): boolean;
}

/** Current session identity with permission checks independent of display roles. */
export interface Credentials extends Permission {
  readonly isAuthenticated: boolean;
  readonly session: Session | null;
  readonly roles: readonly string[];
}

/** Zero-configuration permission policy. */
export class AllowAnyPermission implements Permission {
  hasPermission(_key: string): boolean {
    return true;
  }
  hasAnyPermission(..._keys: string[]): boolean {
    return true;
  }
}

/** Unauthenticated identity with no session, no roles and no granted permissions. */
export class AnonymousCredentials implements Credentials {
  readonly isAuthenticated = false;
  readonly session = null;
  readonly roles: readonly string[] = [];
  hasPermission(_key: string): boolean {
    return false;
  }
  hasAnyPermission(..._keys: string[]): boolean {
    return false;
  }
}

/** Authenticated identity whose permission checks use only session.permissions. */
export class SessionCredentials implements Credentials {
  readonly isAuthenticated = true;
  readonly roles: readonly string[];
  constructor(readonly session: Session) {
    this.roles = session.roles;
  }
  hasPermission(key: string): boolean {
    return this.session.permissions.includes(key);
  }
  hasAnyPermission(...keys: string[]): boolean {
    return keys.some((key) => this.hasPermission(key));
  }
}
