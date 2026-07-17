// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  InputSignal,
  OnInit,
  Output,
  Signal,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

// internal imports
import { ConfigurableComponent } from '../bootstrap.component';
import { ButtonComponent } from '../button/button.component';
import { ButtonOptions } from '../button/button.types';
import { ModalOptions } from './modal.types';

/**
 * ng-bootstrap modal wrapper with a configurable header, submit/cancel buttons, and
 * an imperative `open()` API.
 *
 * ```html
 * <rnf-modal #modal [bodyTemplate]="body" [options]="modalOptions">
 *   <ng-template #body>
 *     <p>Are you sure?</p>
 *   </ng-template>
 * </rnf-modal>
 * ```
 * ```ts
 * @ViewChild('modal') modal!: ModalComponent;
 * readonly modalOptions: Partial<ModalOptions> = {
 *   header: { text: 'Confirm', icon: 'exclamation-triangle-fill', classes: 'text-bg-warning' },
 *   submitBtn: { class: 'danger', label: 'Delete', callback: () => this.onDelete() },
 * };
 *
 * openModal() { this.modal.open(); }
 * ```
 *
 * Emits `(opened)` with the `NgbModalRef` and `(dismissed)` with the dismiss reason.
 */
@Component({
  selector: 'rnf-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent
  extends ConfigurableComponent<ModalOptions>
  implements OnInit
{
  private modalService = inject(NgbModal);

  /** Input properties **/
  bodyTemplate: InputSignal<TemplateRef<unknown>> = input.required();
  contentTemplate: InputSignal<TemplateRef<unknown> | undefined> = input<
    TemplateRef<unknown> | undefined
  >();

  @ViewChild('defaultContent') private defaultContent!: TemplateRef<unknown>;

  /** Output events **/
  @Output() opened = new EventEmitter<NgbModalRef>();
  @Output() dismissed = new EventEmitter<unknown>();

  protected cancelButtonOptions: Signal<Partial<ButtonOptions>> = computed(
    () => {
      return {
        type: 'button',
        class: 'secondary',
        label:
          typeof this.config.cancelBtn === 'string'
            ? (this.config.cancelBtn as string)
            : 'Cancel',
        ...(typeof this.config.cancelBtn === 'object'
          ? (this.config.cancelBtn as object)
          : {}),
      };
    },
  );

  /** ConfigurableComponent overrides **/
  override configKey = 'modal';

  override defaultOptions(): Partial<ModalOptions> {
    return {
      header: {
        text: '',
        icon: '',
        classes: '',
      },
      cancelBtn: true,
      centered: true,
      scrollable: true,
    };
  }

  /** Component methods **/
  get activeInstances(): EventEmitter<NgbModalRef[]> {
    return this.modalService.activeInstances;
  }

  /** Opens the modal. Emits `(opened)` with the `NgbModalRef`. */
  open(): void {
    const ref = this.modalService.open(
      this.contentTemplate() ?? this.defaultContent,
      this.config,
    );
    this.opened.emit(ref);
    ref.dismissed.subscribe((reason) => this.dismissed.emit(reason));
  }

  dismissAll(reason: unknown): void {
    this.modalService.dismissAll(reason);
  }

  hasOpenModals(): boolean {
    return this.modalService.hasOpenModals();
  }
}

// re-export for public API
export type { ModalOptions } from './modal.types';
