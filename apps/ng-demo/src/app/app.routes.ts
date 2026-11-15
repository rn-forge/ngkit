// external imports
import { Route } from '@angular/router';

// internal imports
import { authGuard, permissionGuard } from '@rn-forge/ng/auth';
import { ErrorComponent } from '@rn-forge/ng-bootstrap';
import { LoginComponent, UserComponent } from '@rn-forge/ng-bootstrap/auth';
import { DashboardPageComponent } from './dashboard/dashboard.page';
import { FormsPageComponent } from './forms/forms.page';
import { OrgChartPageComponent } from './org-chart/org-chart.page';
import { ProductsPageComponent } from './products/products.page';

export const appRoutes: Route[] = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'error',
    component: ErrorComponent,
    data: {
      options: {
        code: 500,
        message: 'Something went wrong',
        support: {
          label: 'Contact Support',
          url: 'mailto:support@example.com',
        },
        home: { label: 'Go Home', url: '/' },
      },
    },
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardPageComponent,
        canActivate: [permissionGuard('demo.dashboard')],
      },
      {
        path: 'products',
        component: ProductsPageComponent,
        canActivate: [permissionGuard('demo.products')],
      },
      {
        path: 'forms',
        component: FormsPageComponent,
        canActivate: [permissionGuard('demo.forms')],
      },
      {
        path: 'org-chart',
        component: OrgChartPageComponent,
        canActivate: [permissionGuard('demo.org-chart')],
      },
      { path: 'user/profile', component: UserComponent },
      { path: 'user/settings', component: UserComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: '**',
        component: ErrorComponent,
        data: {
          options: {
            code: 404,
            message: 'Page not found',
            support: {
              label: 'Contact Support',
              url: 'mailto:support@example.com',
            },
            home: { label: 'Go Home', url: '/' },
          },
        },
      },
    ],
  },
];
