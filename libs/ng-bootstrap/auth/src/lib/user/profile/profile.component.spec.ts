import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserProfileComponent } from './profile.component';

const PROFILE = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  permissions: ['read'],
  groups: [],
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

  it('profileAttributes includes an entry with the email value', () => {
    const emailAttr = component
      .profileAttributes()
      .find((a) => a.key === 'email');
    expect(emailAttr?.value).toBe('test@example.com');
  });
});
