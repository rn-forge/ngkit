// external imports
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

// internal imports
import { RouteService } from '@rn-forge/ng/core';
import { AlertComponent } from '@rn-forge/ng-bootstrap';
import { AbstractAuthPage } from '../abstract-auth-page';
import { ConfigOptions } from '@rn-forge/ng-bootstrap';
import { ButtonComponent } from '@rn-forge/ng-bootstrap';
import {
  UserProfileComponent,
  UserProfileOptions,
} from './profile/profile.component';
import { UserSettingsComponent, UserSettingsOptions } from './settings';

// types
export interface UserOptions extends ConfigOptions {
  profile: Partial<UserProfileOptions>;
  settings: Partial<UserSettingsOptions>;
}

// component definition
@Component({
  selector: 'rnf-user',
  standalone: true,
  imports: [
    CommonModule,
    AlertComponent,
    ButtonComponent,
    UserProfileComponent,
    UserSettingsComponent,
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
})
export class UserComponent
  extends AbstractAuthPage<UserOptions>
  implements OnInit
{
  protected readonly routeService = inject(RouteService);
  private readonly activatedRoute = inject(ActivatedRoute);
  subpath = '';

  override ngOnInit(): void {
    super.ngOnInit();
    const segments = this.activatedRoute.snapshot.url;
    this.subpath =
      segments.length > 0 ? segments[segments.length - 1].path : '';
  }

  override configKey = 'user';

  override defaultOptions(): Partial<UserOptions> {
    return {
      profile: {
        enabled: true,
      },
      settings: {
        enabled: true,
      },
    };
  }
}
