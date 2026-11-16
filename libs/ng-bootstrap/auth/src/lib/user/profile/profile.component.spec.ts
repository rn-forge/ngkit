// external imports
import { ComponentFixture, TestBed } from '@angular/core/testing';

// internal imports
import { UserProfileComponent } from './profile.component';

const PROFILE = {
  email: 'test@example.com',
  subject: 'test',
  name: 'Test User',
  picture: '/test.png',
  provider: 'development',
  roles: ['admin'],
  expiresAt: '2099-01-01T00:00:00Z',
  permissions: ['read'],
};

describe('UserProfileComponent', () => {
  let component: UserProfileComponent;
  let fixture: ComponentFixture<UserProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfileComponent],
    });
    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', PROFILE);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('profileAttributes is populated from the default config attributes', () => {
    expect(component.profileAttributes().length).toBeGreaterThan(0);
  });

  it('renders the session fields with joined roles and permissions', () => {
    expect(component.profileAttributes().map((a) => a.key)).toEqual([
      'subject',
      'name',
      'email',
      'picture',
      'provider',
      'roles',
      'permissions',
      'expiresAt',
    ]);
    expect(
      component.profileAttributes().find((a) => a.key === 'roles')?.value,
    ).toBe('admin');
    expect(
      component.profileAttributes().find((a) => a.key === 'permissions')?.value,
    ).toBe('read');
  });

  it('profileAttributes includes an entry with the email value', () => {
    const emailAttr = component
      .profileAttributes()
      .find((a) => a.key === 'email');
    expect(emailAttr?.value).toBe('test@example.com');
  });
});
