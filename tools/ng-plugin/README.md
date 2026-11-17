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
