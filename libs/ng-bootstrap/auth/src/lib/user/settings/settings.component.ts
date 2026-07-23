// external imports
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forIn, merge, pickBy, transform } from 'lodash-es';

// internal imports
import { GenericType, RouteService, isDebugMode } from '@rn-forge/ng/core';
import {
  ColumnOptions,
  ConfigurableComponent,
  TableComponent,
  TableOptions,
} from '@rn-forge/ng-bootstrap';
import {
  DropdownFieldComponent,
  FormComponent,
  FormOptions,
  TypeaheadFieldComponent,
} from '@rn-forge/ng-bootstrap/form';
import { UserSettingsService } from './settings.service';
import {
  DEFAULT_USER_SETTINGS_OPTIONS,
  USER_SETTINGS_CONFIG_KEY,
  UserSettingConfig,
  UserSettingsOptions,
} from './settings.types';

/**
 * Represents the user settings component, allowing users to view and modify their personal settings.
 *
 * This component dynamically builds the form based on config defaults and user provided global config, and synchronizes changes with the `UserSettingsService`.
 *
 * ## Features
 * - Dynamically generates form controls for each enabled user setting.
 * - Merges standard and custom settings, applying default values as needed.
 * - Listens for form value changes and updates user settings accordingly.
 * - Provides options to reset settings and disables the cancel button by default.
 * - Exposes the current user settings as a JSON string.
 *
 * ## Usage
 * Use this component to present a configurable user settings form in your application.
 *
 * @template UserSettingsOptions - The options type for user settings configuration.
 * @extends BaseConfigurableComponent<UserSettingsOptions>
 * @implements OnInit
 *
 * @property {FormBuilder} formBuilder - Angular form builder for constructing reactive forms.
 * @property {StyleHelper} styleHelper - Helper for applying styles.
 * @property {UserSettingsService} userSettingsService - Service for managing user settings.
 * @property {FormComponent} userSettingsForm - Reference to the form component in the template.
 * @property {Signal<UserSettingConfig[]>} allSettings - Signal containing all enabled user settings.
 * @property {Partial<FormOptions>} userSettingsFormOptions - Options for configuring the user settings form.
 *  */

@Component({
  selector: 'rnf-user-settings',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormComponent,
    DropdownFieldComponent,
    TypeaheadFieldComponent,
    TableComponent,
  ],
  templateUrl: './settings.component.html',
})
export class UserSettingsComponent
  extends ConfigurableComponent<UserSettingsOptions>
  implements OnInit
{
  private readonly formBuilder: FormBuilder = inject(FormBuilder);
  private readonly routeService: RouteService = inject(RouteService);
  protected userSettingsService: UserSettingsService =
    inject(UserSettingsService);

  private activeSettings!: UserSettingConfig[];
  protected userSettingsTableOptions!: Partial<TableOptions>;
  protected userSettingsFormOptions!: Partial<FormOptions>;

  @ViewChild('userSettingsForm') readonly userSettingsForm!: FormComponent;

  constructor() {
    super();
    this.initialize();
  }

  /** ConfigurableComponent methods **/
  override configKey = USER_SETTINGS_CONFIG_KEY;

  override defaultOptions(): Partial<UserSettingsOptions> {
    return DEFAULT_USER_SETTINGS_OPTIONS;
  }

  override configureOptions(
    currentOptions: Partial<UserSettingsOptions>,
  ): void {
    currentOptions.format =
      this.routeService.queryParams['format'] ?? currentOptions.format;
  }

  /** Component methods **/
  private initialize(): void {
    this.activeSettings = Object.values(
      pickBy(
        merge({}, this.config.standardSettings, this.config.customSettings),
        (setting) => setting.enabled ?? true,
      ),
    ) as UserSettingConfig[];
    if (isDebugMode()) {
      console.debug(
        'UserSettingsComponent.initialize.activeSettings:',
        this.activeSettings,
      );
    }

    this.userSettingsTableOptions = this.getUserSettingsTableOptions();
    this.userSettingsFormOptions = this.getUserSettingsFormOptions();
  }

  private getUserSettingsTableOptions(): Partial<TableOptions> {
    return {
      columns: [
        [
          {
            title: 'Settings',
            colspan: 2,
          },
        ],
        [
          {
            title: 'Name',
            field: 'name',
            sortable: true,
          },
          {
            title: 'Value',
            field: 'value',
            sortable: true,
          },
        ],
      ] as ColumnOptions[],
      data: this.activeSettings.map((setting) => {
        return {
          name: setting.label,
          value: this.userSettingsService.currentUserSettings[setting.key],
        };
      }),
      toolbarButtons: [
        {
          type: 'button',
          class: 'danger',
          icon: 'x-octagon',
          label: 'clear',
          callback: () => this.clearUserSettings(),
        },
      ],
      headerStyle: (column) => {
        return column.field === undefined
          ? // top rows
            {
              classes: 'bg-secondary',
            }
          : // bottom row
            {
              classes: 'bg-primary',
            };
      },
      search: false,
      pagination: false,
      showPaginationSwitch: false,
      showFilterControlSwitch: false,
      mobileResponsive: false,
      // toolbar
      showColumns: false,
      showColumnsToggleAll: false,
      showExport: false,
      showFullscreen: false,
      showRefresh: false,
      showToggle: false,
      stickyHeader: false,
    };
  }

  /**
   * Clears all user settings.
   */
  private clearUserSettings(): void {
    if (isDebugMode()) console.debug('UserSettingsComponent.clearUserSettings');
    this.userSettingsService.clearStoredSettings();
    this.userSettingsFormOptions = this.getUserSettingsFormOptions();
  }

  /**
   * Gets the user settings form options.
   */
  private getUserSettingsFormOptions(): Partial<FormOptions> {
    const controls = transform(
      this.activeSettings as UserSettingConfig[],
      (result: GenericType, setting: UserSettingConfig) => {
        result[setting.key] = [
          this.userSettingsService.storedUserSettings[setting.key],
        ];
      },
      {} as GenericType,
    );
    if (isDebugMode()) {
      console.debug(
        'UserSettingsComponent.getUserSettingsFormOptions.controls:',
        controls,
      );
    }

    return {
      header: 'Stored Settings',
      controls: controls,
      cancelBtn: false, // disable cancel button
      resetBtn: true, // enable reset button
      contextParams: {
        settings: this.activeSettings,
      },
    };
  }

  protected saveUserSettings(formValue: GenericType): void {
    if (isDebugMode())
      console.info('UserSettingsComponent.saveUserSettings:', formValue);

    forIn(formValue, (value, key) => {
      if (value !== this.userSettingsService.storedUserSettings[key]) {
        if (isDebugMode())
          console.warn(
            'UserSettingsComponent.userSetting.updated:',
            key,
            value,
          );
        this.userSettingsService.updateSetting(key, value as string);
      }
    });

    this.userSettingsFormOptions = this.getUserSettingsFormOptions();
  }
}
