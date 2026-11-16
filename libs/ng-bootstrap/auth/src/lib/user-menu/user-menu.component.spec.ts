// external imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { defer, EMPTY } from 'rxjs';

// internal imports
import {
  FakeAuthService,
  provideRnForgeAuthTesting,
} from '@rn-forge/ng/auth/testing';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  let fixture: ComponentFixture<UserMenuComponent>;
  let auth: FakeAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [provideRnForgeAuthTesting(null), provideRouter([])],
    });
    auth = TestBed.inject(FakeAuthService);
    fixture = TestBed.createComponent(UserMenuComponent);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders the signed-in name, picture, email and provider', () => {
    auth.setSession({
      subject: 'ada',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      picture: '/ada.png',
      provider: 'workspace',
      roles: [],
      permissions: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      'button.dropdown-toggle',
    ) as HTMLButtonElement;
    const image = toggle.querySelector('img') as HTMLImageElement;
    expect(toggle.textContent).toContain('Ada Lovelace');
    expect(toggle.matches('.btn[data-bs-toggle="dropdown"]')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(image.getAttribute('src')).toBe('/ada.png');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.width).toBe(24);
    expect(fixture.nativeElement.textContent).toContain('ada@example.com');
    expect(fixture.nativeElement.textContent).toContain(
      'Signed in with workspace',
    );
  });

  it('falls back to subject and omits absent picture and email', () => {
    auth.setSession({
      subject: 'ada',
      provider: 'workspace',
      roles: [],
      permissions: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      'button.dropdown-toggle',
    ) as HTMLButtonElement;
    expect(toggle.textContent).toContain('ada');
    expect(toggle.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('@');
    expect(
      fixture.nativeElement.querySelector('.dropdown-header').children.length,
    ).toBe(2);
  });

  it('renders nothing while anonymous', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.childElementCount).toBe(0);
  });

  it('renders only the configured profile link', () => {
    fixture.componentRef.setInput('profileUrl', '/user/profile');
    auth.setSession({
      subject: 'ada',
      provider: 'workspace',
      roles: [],
      permissions: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });

    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    expect(
      links.filter((link) => link.textContent.trim() === 'Profile'),
    ).toHaveLength(1);
    expect(
      links
        .find((link) => link.textContent.trim() === 'Profile')
        ?.getAttribute('href'),
    ).toBe('/user/profile');
    expect(links.some((link) => link.textContent.trim() === 'Settings')).toBe(
      false,
    );
  });

  it('calls logout when Sign out is clicked', () => {
    auth.setSession({
      subject: 'ada',
      provider: 'workspace',
      roles: [],
      permissions: [],
      expiresAt: '2099-01-01T00:00:00Z',
    });
    const subscribed = vi.fn();
    const logout = vi.spyOn(auth, 'logout').mockReturnValue(
      defer(() => {
        subscribed();
        return EMPTY;
      }),
    );
    fixture.detectChanges();

    const signOut = (
      Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[]
    ).find(
      (button) => button.textContent.trim() === 'Sign out',
    ) as HTMLButtonElement;
    signOut.click();

    expect(logout).toHaveBeenCalledOnce();
    expect(subscribed).toHaveBeenCalledOnce();
  });
});
