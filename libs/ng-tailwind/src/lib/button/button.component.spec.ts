import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { RnfButton } from './button.component';

@Component({
  imports: [RnfButton],
  template: `
    <button
      rnfButton
      [variant]="variant()"
      [shape]="shape()"
      [size]="size()"
      [disabled]="disabled()"
      [busy]="busy()"
      (click)="clicks.set(clicks() + 1)">
      Save
    </button>
  `,
})
class ButtonHost {
  readonly variant = signal<'secondary' | 'primary' | 'ghost'>('secondary');
  readonly shape = signal<'default' | 'pill'>('default');
  readonly size = signal<'md' | 'sm'>('md');
  readonly disabled = signal(false);
  readonly busy = signal(false);
  readonly clicks = signal(0);
}

@Component({
  imports: [RnfButton, RouterLink],
  template: `
    <a
      rnfButton
      routerLink="/x"
      [variant]="variant()"
      [disabled]="disabled()"
      [busy]="busy()"
      (click)="clicks.set(clicks() + 1)">
      Go
    </a>
  `,
})
class AnchorHost {
  readonly variant = signal<'secondary' | 'danger'>('secondary');
  readonly disabled = signal(false);
  readonly busy = signal(false);
  readonly clicks = signal(0);
}

@Component({
  imports: [RnfButton],
  template: `
    <form (submit)="$event.preventDefault(); submitted.set(submitted() + 1)">
      <button rnfButton type="submit">Send</button>
    </form>
  `,
})
class FormHost {
  readonly submitted = signal(0);
}

@Component({ template: '' })
class Page {}

describe('RnfButton (F8.3, S8.3.1)', () => {
  afterEach(() => TestBed.resetTestingModule());

  describe('on <button>', () => {
    let fixture: ComponentFixture<ButtonHost>;
    let host: ButtonHost;
    const button = () =>
      fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [ButtonHost] });
      fixture = TestBed.createComponent(ButtonHost);
      host = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('keeps its tag and gets the class and default data attributes', () => {
      expect(button().tagName).toBe('BUTTON');
      expect(button().classList).toContain('rnf-button');
      expect(button().dataset['variant']).toBe('secondary');
      expect(button().dataset['shape']).toBe('default');
      expect(button().dataset['size']).toBe('md');
      expect(button().hasAttribute('disabled')).toBe(false);
      expect(button().hasAttribute('aria-busy')).toBe(false);
    });

    it('reflects the inputs in the data attributes', () => {
      host.variant.set('primary');
      host.shape.set('pill');
      host.size.set('sm');
      fixture.detectChanges();
      expect(button().dataset['variant']).toBe('primary');
      expect(button().dataset['shape']).toBe('pill');
      expect(button().dataset['size']).toBe('sm');
    });

    it('sets the native disabled attribute and no aria-disabled when disabled', () => {
      host.disabled.set(true);
      fixture.detectChanges();
      expect(button().disabled).toBe(true);
      expect(button().hasAttribute('aria-disabled')).toBe(false);
      expect(button().hasAttribute('tabindex')).toBe(false);
    });

    it('sets disabled and aria-busy when busy', () => {
      host.busy.set(true);
      fixture.detectChanges();
      expect(button().disabled).toBe(true);
      expect(button().getAttribute('aria-busy')).toBe('true');
    });

    it('reaches a (click) handler when enabled', () => {
      button().click();
      expect(host.clicks()).toBe(1);
    });
  });

  describe('on <a routerLink>', () => {
    let fixture: ComponentFixture<AnchorHost>;
    let host: AnchorHost;
    let router: Router;
    const anchor = () =>
      fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [AnchorHost],
        providers: [provideRouter([{ path: 'x', component: Page }])],
      });
      fixture = TestBed.createComponent(AnchorHost);
      host = fixture.componentInstance;
      router = TestBed.inject(Router);
      fixture.detectChanges();
    });

    it('keeps its tag, gets the class and default data attributes', () => {
      expect(anchor().tagName).toBe('A');
      expect(anchor().classList).toContain('rnf-button');
      expect(anchor().dataset['variant']).toBe('secondary');
      expect(anchor().dataset['shape']).toBe('default');
      expect(anchor().dataset['size']).toBe('md');
      expect(anchor().getAttribute('href')).toBe('/x');
      expect(anchor().hasAttribute('aria-disabled')).toBe(false);
      expect(anchor().hasAttribute('tabindex')).toBe(false);
      expect(anchor().hasAttribute('disabled')).toBe(false);
    });

    it('navigates and reaches a (click) handler when enabled', async () => {
      anchor().click();
      await fixture.whenStable();
      expect(router.url).toBe('/x');
      expect(host.clicks()).toBe(1);
    });

    it('swallows clicks when disabled', async () => {
      host.disabled.set(true);
      fixture.detectChanges();
      expect(anchor().getAttribute('aria-disabled')).toBe('true');
      expect(anchor().getAttribute('tabindex')).toBe('-1');
      expect(anchor().hasAttribute('disabled')).toBe(false);

      anchor().click();
      await fixture.whenStable();
      expect(router.url).toBe('/');
      expect(host.clicks()).toBe(0);
    });

    it('swallows clicks when busy and sets aria-busy', async () => {
      host.busy.set(true);
      fixture.detectChanges();
      expect(anchor().getAttribute('aria-busy')).toBe('true');
      expect(anchor().getAttribute('aria-disabled')).toBe('true');
      expect(anchor().getAttribute('tabindex')).toBe('-1');

      anchor().click();
      await fixture.whenStable();
      expect(router.url).toBe('/');
      expect(host.clicks()).toBe(0);
    });

    it('navigates again once re-enabled', async () => {
      host.disabled.set(true);
      fixture.detectChanges();
      host.disabled.set(false);
      fixture.detectChanges();
      anchor().click();
      await fixture.whenStable();
      expect(router.url).toBe('/x');
      expect(host.clicks()).toBe(1);
    });
  });

  describe('in a form', () => {
    it('submits the form from a type="submit" button', () => {
      TestBed.configureTestingModule({ imports: [FormHost] });
      const fixture = TestBed.createComponent(FormHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        'button',
      ) as HTMLButtonElement;
      expect(button.getAttribute('type')).toBe('submit');
      button.click();
      expect(fixture.componentInstance.submitted()).toBe(1);
    });
  });
});
