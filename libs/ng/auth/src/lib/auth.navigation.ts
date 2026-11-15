// external imports
import { DOCUMENT, Injectable, inject } from '@angular/core';

/** Injectable browser navigation used when leaving the application. */
@Injectable({ providedIn: 'root' })
export class FullPageNavigation {
  private readonly document = inject(DOCUMENT);

  /** Navigate the browser to the supplied URL. */
  assign(url: string): void {
    this.document.defaultView?.location.assign(url);
  }
}
