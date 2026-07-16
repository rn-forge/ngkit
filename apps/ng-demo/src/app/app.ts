import { Component, inject, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@rn-forge/ng/auth';
import { StyleHelper } from '@rn-forge/ng-bootstrap';
import {
  ColorMode,
  DIVIDER,
  FooterComponent,
  FooterOptions,
  HeaderComponent,
  HeaderOptions,
} from '@rn-forge/ng-bootstrap/shell';
import { ModalComponent, ModalOptions } from '@rn-forge/ng-bootstrap';
import { UserSettingsService } from '@rn-forge/ng-bootstrap/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ColorMode,
    FooterComponent,
    HeaderComponent,
    ModalComponent,
  ],
  host: { class: 'd-flex flex-column flex-grow-1' },
  templateUrl: './app.html',
})
export class App {
  protected readonly authService = inject(AuthService);

  private readonly _styleHelper = inject(StyleHelper);
  private readonly _userSettingsService = inject(UserSettingsService);

  @ViewChild('helpModal') private helpModal!: ModalComponent;

  protected headerOptions: HeaderOptions = {
    id: 'app-header',
    bgColor: 'primary',
    watermark: {
      text: 'DEMO',
      breakpoint: 'xxl',
    },
    brand: {
      logo: { src: 'favicon.ico', height: 30, width: 30 },
      text: 'RN Forge',
      class: 'text-warning',
    },
    title: {
      text: 'Demo App',
      class: 'text-white-50',
    },
    navbar: {
      type: 'header',
      breakpoint: 'xl',
      class: 'gap-2',
      offcanvas: {
        direction: 'end',
        header: { title: 'Navigation' },
      },
      items: [
        { type: 'link', label: 'Dashboard', href: '/dashboard' },
        { type: 'link', label: 'Products', href: '/products' },
        { type: 'link', label: 'Forms', href: '/forms' },
        { type: 'link', label: 'Org Chart', href: '/org-chart' },
        DIVIDER,
        {
          type: 'color-mode',
          submenu: { type: 'dropdown', class: 'dropdown-menu-end' },
        },
        DIVIDER,
        {
          type: 'submenu',
          label: 'User',
          submenu: {
            type: 'dropdown',
            class: 'dropdown-menu-end',
            items: [
              { type: 'link', label: 'Profile', href: '/user/profile' },
              { type: 'link', label: 'Settings', href: '/user/settings' },
              {
                type: 'callback',
                label: 'Logout',
                callback: () => this.authService.logout(),
              },
            ],
          },
        },
      ],
    },
    position: { brand: 'left', menu: 'right', toggler: 'right' },
  };

  protected footerOptions: FooterOptions = {
    id: 'app-footer',
    breakpoint: 'md',
    brand: {
      logo: { src: 'favicon.ico', height: 30, width: 30 },
      text: 'RN Forge',
      class: 'text-muted',
    },
    copyright: '© 2025 RN Forge. All rights reserved.',
    navbar: {
      type: 'footer',
      useDivider: true,
      items: [
        {
          type: 'url',
          label: 'GitHub',
          href: 'https://github.com',
          target: '_blank',
        },
        {
          type: 'callback',
          label: 'Help',
          callback: () => this.helpModal.open(),
        },
        {
          type: 'submenu',
          label: 'Libraries',
          submenu: {
            type: 'dropup',
            items: [
              { type: 'url', label: 'ng-bootstrap', href: '#' },
              { type: 'url', label: 'ng-core', href: '#' },
              { type: 'url', label: 'ng-http', href: '#' },
              { type: 'url', label: 'ng-auth', href: '#' },
            ],
          },
        },
        {
          type: 'color-mode',
          class: 'color-mode',
          submenu: { type: 'dropup', class: 'dropdown-menu-end' },
        },
      ],
    },
  };

  protected helpModalOptions: ModalOptions = {
    header: {
      text: 'Help',
      icon: 'bi bi-question-circle',
      classes: 'bg-info text-white',
    },
    title: 'Help',
  };
}
