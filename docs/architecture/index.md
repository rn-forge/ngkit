# Architecture

How ngkit's libraries and repository are put together today. Read in this order:

- [Workspace](workspace.md): projects, entry points and the dependency direction.
- [Configuration](configuration.md): the `ConfigurableComponent` options model.
- [Core](core.md): browser storage rules and the behavior of the core utilities.
- [Resource screen](resource-screen.md): the standards, data-source contract, package split and wire mapping of the CRUD screen.
- [Release pipeline](release-pipeline.md): build-once `dist/`, versioning, packing, verification, CI and the docs site.
- [CI template](ci-template.md): which CI files are portable, what a repository declares for them, and how to check a copy.
