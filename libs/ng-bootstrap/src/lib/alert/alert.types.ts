import { ConfigOptions } from '../bootstrap.component';
import { STYLE } from '../bootstrap.types';

export interface AlertOptions extends ConfigOptions {
  animation: boolean;
  dismissible: boolean;
  icons: Partial<{ [key in STYLE]: string }>;
  autoHide: number;
  simulateDelay: number;
  progress: {
    init: number;
    increment: number;
    interval: number;
  };
}
