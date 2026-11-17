/**
 * Peer dependencies of `@rn-forge/ng-bootstrap` other than `@rn-forge/ng`
 * (a superset of `@rn-forge/ng`'s peers); `setup` adds them to the app.
 */
export const PEER_DEPENDENCIES: Readonly<Record<string, string>> = {
  '@angular/cdk': '^22.0.4',
  '@angular/common': '^22.0.6',
  '@angular/core': '^22.0.6',
  '@angular/forms': '^22.0.6',
  '@angular/localize': '^22.0.6',
  '@angular/router': '^22.0.6',
  '@ng-bootstrap/ng-bootstrap': '^21.0.0',
  bootstrap: '^5.3.8',
  'bootstrap-icons': '^1.13.1',
  'bootstrap-table': '^1.27.3',
  jquery: '^4.0.0',
  'jquery-treegrid': '^0.3.0',
  'lodash-es': '^4.18.1',
  'ngx-quill': '^31.0.1',
  quill: '^2.0.3',
  rxjs: '~7.8.2',
  uuid: '^14.0.1',
};

/** The Bootstrap Table packages, installed by the Bootstrap Table helper. */
export const BOOTSTRAP_TABLE_PACKAGES = [
  'bootstrap-table',
  'jquery',
  'jquery-treegrid',
] as const;

/** CommonJS dependencies that `setup` lists in `allowedCommonJsDependencies`. */
export const COMMONJS_DEPENDENCIES = [
  'bootstrap/dist/js/bootstrap.bundle.js',
  'build-url-ts',
  'jquery',
  'jquery-treegrid',
  'quill-delta',
] as const;

/** The polyfill `@ng-bootstrap/ng-bootstrap` needs at runtime. */
export const LOCALIZE_POLYFILL = '@angular/localize/init';
