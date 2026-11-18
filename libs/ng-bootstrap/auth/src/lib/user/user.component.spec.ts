// external imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

// internal imports
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { UserComponent } from './user.component';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
      providers: [
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('does not render a profile for an anonymous user', () => {
    component.subpath = 'profile';
    fixture.detectChanges();
    expect(component.session).toBeNull();
    expect(fixture.nativeElement.querySelector('rnf-user-profile')).toBeNull();
  });

  it('has configKey "user"', () => {
    expect(component.configKey).toBe('user');
  });
});
