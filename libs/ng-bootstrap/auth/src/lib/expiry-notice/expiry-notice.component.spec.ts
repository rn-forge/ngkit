// external imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

// internal imports
import {
  FakeAuthService,
  provideRnForgeAuthTesting,
} from '@rn-forge/ng/auth/testing';
import { SessionExpiryNoticeComponent } from './expiry-notice.component';

describe('SessionExpiryNoticeComponent', () => {
  let fixture: ComponentFixture<SessionExpiryNoticeComponent>;
  let auth: FakeAuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionExpiryNoticeComponent],
      providers: [provideRnForgeAuthTesting(null), provideRouter([])],
    });
    auth = TestBed.inject(FakeAuthService);
    fixture = TestBed.createComponent(SessionExpiryNoticeComponent);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders only while an expiry warning is active', () => {
    auth.setExpiryWarning(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

    auth.setExpiryWarning(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.alert-warning')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Your session ends soon.',
    );
  });

  it('starts login again with the current router URL', () => {
    auth.setExpiryWarning(true);
    const router = TestBed.inject(Router);
    const startLogin = vi.spyOn(auth, 'startLogin');
    fixture.detectChanges();

    const button = (
      Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[]
    ).find(
      (candidate) => candidate.textContent.trim() === 'Sign in again',
    ) as HTMLButtonElement;
    button.click();

    expect(startLogin).toHaveBeenCalledWith(router.url);
  });

  it('hides when dismissed', () => {
    auth.setExpiryWarning(true);
    fixture.detectChanges();
    const dismiss = fixture.nativeElement.querySelector(
      'button[aria-label="Dismiss"]',
    ) as HTMLButtonElement;
    dismiss.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('warns again after the warning clears', () => {
    auth.setExpiryWarning(true);
    fixture.detectChanges();
    const dismiss = fixture.nativeElement.querySelector(
      'button[aria-label="Dismiss"]',
    ) as HTMLButtonElement;
    dismiss.click();
    fixture.detectChanges();

    auth.setExpiryWarning(false);
    fixture.detectChanges();
    auth.setExpiryWarning(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
});
