import { ErrorHandler, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable()
export class DemoErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);

  handleError(error: unknown): void {
    console.error('Uncaught error:', error);
    this.router.navigate(['/error']);
  }
}
