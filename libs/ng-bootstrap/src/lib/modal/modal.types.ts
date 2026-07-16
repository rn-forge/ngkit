import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { GenericType } from '@rn-forge/ng/core';
import { ConfigOptions } from '../bootstrap.component';
import { ButtonOptions } from '../button/button.types';

export interface ModalOptions extends ConfigOptions, NgbModalOptions {
  header: {
    text: string;
    icon?: string;
    classes?: string;
  };
  contextParams?: GenericType;
  submitBtn?: ButtonOptions;
  cancelBtn?: boolean | string | ButtonOptions;
}
