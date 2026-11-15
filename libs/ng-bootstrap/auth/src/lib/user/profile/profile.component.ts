// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  input,
  InputSignal,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { get } from 'lodash-es';

// internal imports — Session type from auth (only this file + auth EP import it)
import { Session } from '@rn-forge/ng/auth';
import { ConfigOptions, ConfigurableComponent } from '@rn-forge/ng-bootstrap';

// types
export interface UserProfileOptions extends ConfigOptions {
  enabled: boolean;
  attributes: ProfileAttribute[];
  admin: {
    label: string;
    url?: string;
  };
}

// component definition
@Component({
  selector: 'rnf-user-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
})
export class UserProfileComponent
  extends ConfigurableComponent<UserProfileOptions>
  implements OnInit
{
  /** Input properties **/
  profile: InputSignal<Session> = input.required();
  profileAttributes: WritableSignal<ProfileAttribute[]> = signal<
    ProfileAttribute[]
  >([]);
  // attrs: InputSignal<Record<string, string>> = input<Record<string, string>>({});

  /** Lifecycle methods **/
  constructor() {
    super();
    // if (this.attrs) {
    //   this.updateOptions({ attributes: this.attrs() });
    // }
    effect(() => {
      this.profileAttributes.set(
        this.config.attributes.map((attr) => {
          return {
            key: attr.key,
            label: attr.label,
            value: attr.getter
              ? attr.getter(this.profile())
              : get(this.profile(), attr.key),
          };
        }),
      );
    });
  }

  /** ConfigurableComponent methods **/
  override configKey = 'user.profile';

  override defaultOptions(): Partial<UserProfileOptions> {
    return {
      enabled: true,
      attributes: [
        { key: 'subject', label: 'Subject' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'provider', label: 'Provider' },
        {
          key: 'roles',
          label: 'Roles',
          getter: (profile: Session) => profile.roles.join(', '),
        },
        {
          key: 'permissions',
          label: 'Permissions',
          getter: (profile: Session) => profile.permissions.join(', '),
        },
        { key: 'expiresAt', label: 'Expires At' },
      ],
      admin: {
        label: 'Contact Admin',
        url: 'javascript:void(0);',
      },
    };
  }
}

export interface ProfileAttribute {
  key: string;
  label: string;
  getter?: (profile: Session) => string;
  value?: string;
}
