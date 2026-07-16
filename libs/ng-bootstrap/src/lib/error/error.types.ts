import { ConfigOptions } from '../bootstrap.component';

export interface ErrorOptions extends ConfigOptions {
  code: number;
  message: string;
  support?: {
    label: string;
    url: string;
  };
  home?: {
    label: string;
    url: string;
  };
}
