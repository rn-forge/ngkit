// external imports
import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';

// internal imports
import { RNF_CREDENTIALS } from '@rn-forge/ng/auth';
import { AlertComponent } from '@rn-forge/ng-bootstrap';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AlertComponent],
  templateUrl: './dashboard.page.html',
})
export class DashboardPageComponent implements AfterViewInit {
  private readonly credentials = inject(RNF_CREDENTIALS);

  @ViewChild(AlertComponent) private readonly alert?: AlertComponent;

  ngAfterViewInit(): void {
    const session = this.credentials().session;
    this.alert?.success(
      `Welcome, ${session?.name ?? session?.subject ?? 'user'}!`,
    );
  }

  triggerBackendError(): void {
    this.alert?.error('Backend error: 500 Internal Server Error [Simulated]');
  }

  triggerFrontendError(): void {
    throw new Error('Simulated frontend error');
  }
}
