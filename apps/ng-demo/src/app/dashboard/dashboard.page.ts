import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { AuthService } from '@rn-forge/ng/auth';
import { AlertComponent } from '@rn-forge/ng-bootstrap';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AlertComponent],
  templateUrl: './dashboard.page.html',
})
export class DashboardPageComponent implements AfterViewInit {
  protected readonly authService = inject(AuthService);

  @ViewChild(AlertComponent) private alert?: AlertComponent;

  ngAfterViewInit(): void {
    this.alert?.success(
      `Welcome, ${this.authService.jwtToken?.subject ?? 'user'}!`,
    );
  }

  triggerBackendError(): void {
    this.alert?.error('Backend error: 500 Internal Server Error [Simulated]');
  }

  triggerFrontendError(): void {
    throw new Error('Simulated frontend error');
  }
}
