// external imports
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  Renderer2,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { HtmlAttributesDirective } from '@rn-forge/ng/core';

// internal imports
import { ConfigurableComponent } from '../bootstrap.component';
import { AlertOptions } from './alert.types';
import { STYLE } from '../bootstrap.types';

/**
 * Dismissible, optionally auto-hiding alert bar with Bootstrap-style types and an
 * animated progress indicator for long-running operations.
 *
 * Use the imperative API via `@ViewChild`:
 *
 * ```html
 * <rnf-alert #alert />
 * ```
 * ```ts
 * @ViewChild('alert') alert!: AlertComponent;
 *
 * // One-shot messages
 * this.alert.success('Saved successfully');
 * this.alert.error('Something went wrong');
 * this.alert.warning('Check your input', 'exclamation-triangle');
 * this.alert.info('Loading data...');
 *
 * // Loading state (progress bar) → resolve with success or failure
 * this.alert.start('Saving...');
 * this.alert.stop('success', 'Done!');
 *
 * // Simulate (useful in Storybook / demos)
 * this.alert.simulateSuccess('Saving...', 'Saved!');
 * ```
 *
 * Configure globally in `provideRnForgeBootstrapConfig({ alert: { autoHide: 3000 } })`.
 */
@Component({
  selector: 'rnf-alert',
  standalone: true,
  imports: [CommonModule, NgbAlert, HtmlAttributesDirective],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent
  extends ConfigurableComponent<AlertOptions>
  implements AfterViewInit, OnDestroy
{
  @ViewChild('ngbAlert') private readonly ngbAlert!: NgbAlert;
  @ViewChild('ngbAlert', { read: ElementRef })
  private readonly ngbAlertRef!: ElementRef;

  private readonly alertRenderer = inject(Renderer2);

  protected readonly type: WritableSignal<STYLE> = signal('primary');
  protected readonly icon: WritableSignal<string | undefined> =
    signal(undefined);
  protected readonly message: WritableSignal<string | undefined> =
    signal(undefined);

  protected readonly hidden: WritableSignal<boolean> = signal(true);
  protected readonly loading: WritableSignal<boolean> = signal(false);
  protected readonly progress: WritableSignal<number> = signal(0);
  protected interval?: ReturnType<typeof setInterval>;
  protected autoHideTimeout?: ReturnType<typeof setTimeout>;
  protected readonly showProgress = computed(() => this.progress() > 0);

  constructor() {
    super();
    effect(() => {
      if (this.progress() >= 100) {
        this.hide();
      }
    });
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    this.ngbAlert.closed.subscribe(() => this.hide());
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    clearInterval(this.interval);
    clearTimeout(this.autoHideTimeout);
  }

  /** Displays the alert with the given Bootstrap `type`, `message`, and optional `icon` (Bootstrap Icons name). */
  show(type: STYLE, message: string, icon?: string) {
    this.type.set(type);
    this.message.set(message);
    this.icon.set(icon ?? this.config.icons[type]);

    this.loading.set(false);
    this.hidden.set(false);
    this.progress.set(0);
    clearInterval(this.interval);
    clearTimeout(this.autoHideTimeout);

    // re-show ngbAlert after it has been dismissed
    this.alertRenderer.addClass(this.ngbAlertRef.nativeElement, 'show');

    if (this.config.autoHide) {
      this.autoHideTimeout = setTimeout(
        () => this.hide(),
        this.config.autoHide,
      );
    }
  }

  /** Hides the alert and stops any running progress animation. */
  hide() {
    this.loading.set(false);
    this.hidden.set(true);
    clearInterval(this.interval);
    clearTimeout(this.autoHideTimeout);
  }

  /** Shows a loading state with an animated progress bar. Call {@link stop} to resolve. */
  start(message: string, type: STYLE = 'secondary') {
    this.show(type, message, 'exclamation-circle');

    this.progress.set(this.config.progress.init);
    this.interval = setInterval(() => {
      this.progress.set(this.progress() + this.config.progress.increment);
    }, this.config.progress.interval);
  }

  /** Stops the progress bar and transitions to a final message with the given `type`. */
  stop(type: STYLE, message: string, icon?: string) {
    clearInterval(this.interval);
    this.progress.set(0);
    this.show(type, message, icon);
  }

  /** Shows a success (green) alert. */
  success(message: string, icon?: string) {
    this.show('success', message, icon ?? this.config.icons?.success);
  }

  /** Shows an info (blue) alert. */
  info(message: string, icon?: string) {
    this.show('info', message, icon ?? this.config.icons?.info);
  }

  /** Shows a warning (yellow) alert. */
  warning(message: string, icon?: string) {
    this.show('warning', message, icon ?? this.config.icons?.warning);
  }

  /** Shows a danger (red) alert. */
  error(message: string, icon?: string) {
    this.show('danger', message, icon ?? this.config.icons?.danger);
  }

  /**
   * Shows a loading state for `simulateDelay` ms (default 5 s), then calls `success()`.
   * Returns the `setTimeout` handle in case you need to cancel it.
   * Useful for demos and Storybook stories.
   */
  simulateSuccess(
    loadingMessage: string,
    message: string,
    callback?: () => void,
  ) {
    this.start(loadingMessage);
    return setTimeout(() => {
      this.success(message);
      callback?.();
    }, this.config.simulateDelay);
  }

  /** Same as {@link simulateSuccess} but resolves with `error()`. */
  simulateFailure(
    loadingMessage: string,
    message: string,
    callback?: () => void,
  ) {
    this.start(loadingMessage);
    return setTimeout(() => {
      this.error(message);
      callback?.();
    }, this.config.simulateDelay);
  }

  /** ConfigurableComponent overrides */
  override configKey = 'alert';

  override defaultOptions(): Partial<AlertOptions> {
    return {
      animation: true,
      dismissible: true,
      icons: {
        success: 'check-circle',
        info: 'info-circle',
        warning: 'exclamation-circle',
        danger: 'exclamation-triangle',
      },
      autoHide: 0,
      simulateDelay: 5000,
      progress: {
        init: 40,
        increment: 1,
        interval: 500,
      },
    };
  }
}

// re-export for public API
export type { AlertOptions } from './alert.types';
