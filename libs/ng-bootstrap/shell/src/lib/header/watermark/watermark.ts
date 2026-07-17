// external imports
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

// internal imports
import { ConfigOptions, ConfigurableComponent } from '@rn-forge/ng-bootstrap';
import { BREAKPOINT } from '@rn-forge/ng-bootstrap';

@Component({
  selector: 'rnf-watermark',
  imports: [CommonModule],
  templateUrl: './watermark.html',
  styleUrl: './watermark.scss',
})
export class Watermark extends ConfigurableComponent<WatermarkOptions> {
  override configKey = 'watermark';

  override defaultOptions(): Partial<WatermarkOptions> {
    return {
      class: 'text-bg-warning',
    };
  }
}

export interface WatermarkOptions extends ConfigOptions {
  text: string;
  class?: string;
  breakpoint?: BREAKPOINT;
}
