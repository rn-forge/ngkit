# @rn-forge/ng-plugin

Nx generators that set up Angular applications for the rn-forge Angular packages
(`@rn-forge/ng`, `@rn-forge/ng-bootstrap`). Install it as a dev dependency of an
Nx workspace; its version matches the packages it configures.

## `setup`

Configures an existing Angular application to consume `@rn-forge/ng` and
`@rn-forge/ng-bootstrap`.

```bash
pnpm nx g @rn-forge/ng-plugin:setup --project=my-app
```

| Option | Type | Default | Description |
| -- | -- | -- | -- |
| `project` | string | required | Angular application project to configure |
| `packageManager` | `pnpm` \| `npm` \| `yarn` | `pnpm` | Package manager used to install |
| `skipInstall` | boolean | `false` | Skip dependency installation |
| `skipStyles` | boolean | `false` | Skip application stylesheet injection |
| `skipConfig` | boolean | `false` | Skip `allowedCommonJsDependencies`, the `@angular/localize/init` polyfill and the `app.config.ts` provider |
| `includeBootstrapTable` | boolean | `true` | Add the Bootstrap Table dependencies |
| `includeTheme` | boolean | `true` | Import the rn-forge theme in the application stylesheet |

It adds the packages and their peer dependencies, imports the theme between
`rn-forge:start` and `rn-forge:end` markers, lists the CommonJS dependencies,
adds the `@angular/localize/init` polyfill and registers
`provideRnForgeBootstrapConfig({})`. A second run changes nothing.

## `add-bootstrap-table`

Adds the Bootstrap Table dependencies (`bootstrap-table`, `jquery`,
`jquery-treegrid`) to an Angular application.

```bash
pnpm nx g @rn-forge/ng-plugin:add-bootstrap-table --project=my-app
```

| Option | Type | Default | Description |
| -- | -- | -- | -- |
| `project` | string | required | Angular application project to add Bootstrap Table to |
| `skipInstall` | boolean | `false` | Skip dependency installation |
| `scaffoldExample` | boolean | `false` | Add an example standalone component that renders `rnf-table` |

With `scaffoldExample` it writes `bootstrap-table-example.component.ts` under
the application's `app/bootstrap-table-example/` folder, using the project's
`prefix` (or `rnf`) for the selector; an existing file is kept. A second run
changes nothing.

## `configure-theme`

Imports the rn-forge Bootstrap theme into an Angular application's SCSS
stylesheet, between `rn-forge:start` and `rn-forge:end` markers.

```bash
pnpm nx g @rn-forge/ng-plugin:configure-theme --project=my-app
```

| Option | Type | Default | Description |
| -- | -- | -- | -- |
| `project` | string | required | Angular application project whose stylesheet imports the theme |
| `theme` | `default` | `default` | Theme preset to import |
| `stylesheet` | string | build `styles` entry, else `src/styles.scss` | Workspace-relative SCSS file to patch |
| `force` | boolean | `false` | Replace the content of the markers with the plain import |

With `force`, a `with (...)` clause or other lines between the markers are
replaced by the plain `@use` line; without it an existing import is kept. A
second run changes nothing.

## `scaffold-component`

Writes a standalone Angular component in an Angular application or library.

```bash
pnpm nx g @rn-forge/ng-plugin:scaffold-component customer-grid --project=my-app
```

| Option | Type | Default | Description |
| -- | -- | -- | -- |
| `project` | string | required | Angular application or library to add the component to |
| `name` | string | required | Name of the component |
| `directory` | string | `app` (application) or `lib` (library) | Folder under the source root for the component folder |
| `type` | `component`, `page`, `table`, `form` | `component` | Shape of the component |
| `export` | boolean | `false` | Export the component from the library's public API |
| `withStory` | boolean | `false` | Write a Storybook story when the project uses Storybook |
| `withTest` | boolean | `true` | Write a spec file |

It writes `<name>/<name>.component.{ts,html,scss}` (`.page` for `type: page`)
and a spec in its own folder under the source root, using the project's `prefix`
(or `rnf`) for the selector; an existing folder is refused. With `export` it
appends an `export *` line to the library's `src/index.ts`; an application
rejects `export`.

## `create-library`

Creates a publishable Angular library through `@nx/angular`, then applies the
settings that let it pack, verify and release like the other libraries. It needs
`@nx/angular` in the workspace.

```bash
pnpm nx g @rn-forge/ng-plugin:create-library my-ui --importPath=@acme/my-ui
```

| Option | Type | Default | Description |
| -- | -- | -- | -- |
| `name` | string | required | Name of the library project |
| `importPath` | string | required | Package name, for example `@acme/my-ui` |
| `directory` | string | `libs/<name>` | Folder of the library |
| `secondaryEntryPoints` | string | none | Comma-separated secondary entry point names |
| `storybook` | boolean | `false` | Add a Storybook configuration and `build-storybook` target |
| `compodoc` | boolean | `false` | Add a Compodoc configuration and `compodoc` target |
| `coverageThreshold` | number | `35` | Minimum statements, branches, functions and lines coverage |
| `skipInstall` | boolean | `false` | Skip dependency installation |

An existing project of the same name is refused before any change. It writes:

- the `publishable` tag and `release.version.manifestRootsToUpdate` in
  `project.json`, with `pack`, `verify-dist` and `nx-release-publish`
  (`dryRun: true`) targets; `nx.json#release.projects` is left as it was (the
  `publishable` tag selects the project);
- `@angular/*` entries moved into the library's `peerDependencies`;
- `description`, `license`, `repository` (from the root `package.json`, with
  `directory`) and `publishConfig.access: "public"` in the library's
  `package.json`;
- `coverage: true` and the coverage thresholds on the `test` target, and story
  files excluded from `tsconfig.spec.json`;
- with `storybook`, `.storybook/` files, the `build-storybook` target and the
  root `storybook` and `@storybook/angular` devDependencies;
- with `compodoc`, `tsconfig.compodoc.json`, the `compodoc` target and the root
  `@twittwer/compodoc` and `@compodoc/compodoc` devDependencies.

## `configure-testing`

Sets an Angular application's or library's Vitest Angular test target to the
rn-forge defaults. It needs `@nx/angular` in the workspace.

```bash
pnpm nx g @rn-forge/ng-plugin:configure-testing my-ui --coverageThreshold=80
```

| Option | Type | Default | Description |
| -- | -- | -- | -- |
| `project` | string | required | Angular application or library to configure |
| `coverageThreshold` | number | `35` | Minimum statements, branches, functions and lines coverage |
| `reporters` | string | `text,html,json` | Comma-separated coverage reporters |
| `skipInstall` | boolean | `false` | Skip dependency installation |

It adds or updates the `@nx/angular:unit-test` `test` target (coverage on,
reporters and thresholds), adds `vitest/globals`, the `src` includes and the
story excludes to `tsconfig.spec.json`, and declares `vitest`,
`@vitest/coverage-v8` and `jsdom` as root devDependencies; a `test` target with
another executor is refused.
