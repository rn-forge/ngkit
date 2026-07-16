import { ConfigOptions } from '../bootstrap.component';
import { STYLE } from '../bootstrap.types';

export type ButtonType = 'button' | 'submit' | 'reset' | 'close';

export interface ButtonOptions extends ConfigOptions {
  id?: string;
  type?: ButtonType;
  class?: STYLE;
  outline?: boolean;
  icon?: string;
  label?: string;
  additionalClasses?: string;
  disabled?: boolean | (() => boolean);
  callback?: () => void;
}
