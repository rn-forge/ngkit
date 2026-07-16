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
import { get, map } from 'lodash-es';

// internal imports — UserProfile type from auth (only this file + auth EP import it)
import { UserProfile } from '@rn-forge/ng/auth';
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
  styleUrl: './profile.component.scss',
})
export class UserProfileComponent
  extends ConfigurableComponent<UserProfileOptions>
  implements OnInit
{
  /** Input properties **/
  profile: InputSignal<UserProfile> = input.required();
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
        map(this.config.attributes, (attr) => {
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
        {
          key: 'id',
          label: 'ID',
        },
        {
          key: 'email',
          label: 'Email',
        },
        {
          key: 'first_name',
          label: 'First Name',
        },
        {
          key: 'last_name',
          label: 'Last Name',
        },
        {
          key: 'avatar',
          label: 'Avatar',
        },
        {
          key: 'is_staff',
          label: 'Staff User',
        },
        {
          key: 'is_superuser',
          label: 'Superuser',
        },
        {
          key: 'groups',
          label: 'Groups',
          getter: (profile: UserProfile) =>
            profile.groups?.map((g) => g.name).join(', ') ?? '',
        },
        {
          key: 'permissions',
          label: 'Permissions',
          getter: (profile: UserProfile) =>
            profile.permissions?.map((p) => p).join(', ') ?? '',
        },
        {
          key: 'status',
          label: 'Status',
          getter: (profile: UserProfile) => profile.status ?? '',
        },
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
  getter?: (profile: UserProfile) => string;
  value?: string;
}
