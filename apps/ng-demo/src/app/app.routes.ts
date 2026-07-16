import { Route } from '@angular/router';
import { authRouteGuard } from '@rn-forge/ng/auth';
import { ErrorComponent } from '@rn-forge/ng-bootstrap';
import { AuthComponent, UserComponent } from '@rn-forge/ng-bootstrap/auth';
import { DashboardPageComponent } from './dashboard/dashboard.page';
import { FormsPageComponent } from './forms/forms.page';
import { OrgChartPageComponent } from './org-chart/org-chart.page';
import { ProductsPageComponent } from './products/products.page';
import { DEMO_USERS } from './shared/demo-jwt';

export const appRoutes: Route[] = [
  {
    path: 'auth',
    component: AuthComponent,
    data: {
      options: {
        users: DEMO_USERS,
      },
    },
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
    canActivateChild: [authRouteGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardPageComponent,
        data: { permission: 'demo.dashboard' },
      },
      {
        path: 'products',
        component: ProductsPageComponent,
        data: { permission: 'demo.products' },
      },
      {
        path: 'forms',
        component: FormsPageComponent,
        data: { permission: 'demo.forms' },
      },
      {
        path: 'org-chart',
        component: OrgChartPageComponent,
        data: { permission: 'demo.org-chart' },
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
