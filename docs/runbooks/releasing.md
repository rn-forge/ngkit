# Releasing

`@rn-forge/ng` and `@rn-forge/ng-bootstrap` release together, at the same
version, even if only one changed. They distribute as tarballs attached to
GitHub Releases; npm publishing is disabled ([ADR-0003](../adr/ADR-0003.md)).
How the pipeline works is in
[Release pipeline](../architecture/release-pipeline.md).

## 1. Cutting a release

A release is a version bump merged to `main`. It has no inputs and no manual
trigger: the `release` job in `ci.yml` runs on a push to `main` after
`checks-ok`.

1. On a branch, run `task version -- <bump>`, where `<bump>` is `patch`,
   `minor`, `major` or an exact `x.y.z` (an `x.y.z-<id>.n` version releases
   under the npm dist-tag `<id>` instead of `latest`). It bumps both
   libraries, writes the `CHANGELOG.md` section and formats it. `task version`
   with no argument prints the current version. Bumps apply as given, also
   below `1.0.0`.
1. Check the `CHANGELOG.md` section (see
   [Breaking changes](#2-breaking-changes)) and open a pull request.
1. Merge it once `ci-ok` passes. The push to `main` runs the checks again, then
   the release: it tags `v<version>`, rebuilds and verifies the tarballs,
   pushes the tag, creates a draft GitHub Release, publishes it and moves the
   rolling `latest` release.
1. Verify:
    - the tag `v<version>` exists;
    - the GitHub Release exists for it, published and not a draft, with every
      publishable library's tarball attached;
    - the `verify-release` job passed (it installs the tarballs downloaded from
      that release);
    - the rolling `latest` release points at it;
    - `CHANGELOG.md` has an entry for it;
    - `libs/ng/package.json` and `libs/ng-bootstrap/package.json` on `main` both
      show the new version;
    - `ng-bootstrap`'s `peerDependencies["@rn-forge/ng"]` in the tarball is is
      `^` plus the new version; in source it stays `workspace:^`.

A push to `main` whose version already has a published release releases nothing:
the `release` job reports "already released" and `verify-release` is skipped.

If a release fails, rerun the failed `ci.yml` run on `main`. A failure before
the tag is pushed leaves nothing public, and the rerun starts the same version
again. After the push, the rerun finds the tag at `HEAD` and finishes that
version (rebuild, GitHub Release, `latest`); a tag that is not at `HEAD` fails
the run, and the fix is a new version. If `verify-release` fails, the release is
already public: fix forward with a new release.

## 2. Breaking changes

A breaking change reaches `CHANGELOG.md` only if `nx release` finds it in a
commit. `nx.json#release.changelog` sets only
`workspaceChangelog.createRelease: false`, so Nx's default changelog generation
applies, which reads
[Conventional Commits](https://www.conventionalcommits.org/) messages: a
`type(scope): subject` header, with a `BREAKING CHANGE:` footer or a `!` after
the type marking a break. This repository's commits are mostly not conventional,
and `CHANGELOG.md`'s `0.1.2` entry reads "This was a version bump only, there
were no code changes."

So, before a release that carries breaking changes, **do one of these** and
check the `CHANGELOG.md` section `task version` wrote shows them:

- put a `BREAKING CHANGE:` footer in a `feat`, `fix` or `perf` commit that lands
  on `main` (Nx hides other types, such as `ci`, `chore`, `docs` and
  `refactor`, from the changelog, with their footers); or
- edit the `CHANGELOG.md` section in the release pull request (the GitHub
  Release notes come from it).

The release page ([Release 1](../releases/release-1/index.md#breaking-changes))
lists what each release must announce.

## 3. Re-enabling npm

npm publishing is disabled by the hardcoded `dryRun: true` on both libraries'
`nx-release-publish` targets. The generated release already runs
`nx release publish --tag=<dist-tag>` after the tag is pushed and the draft
release exists. To re-enable it, remove that `dryRun` and set up npm Trusted
Publishing (GitHub Actions OIDC, no long-lived token) per package on npmjs.com.

Resume does not retry a failed npm publish on its own: once the GitHub Release
is published, a rerun skips the publish step, so a failed publish needs a manual
`nx release publish`.

### 1. Bootstrap the first publish

npm's Trusted Publisher feature requires a package to already exist on the
registry before it can be configured, so the very first publish of each package
needs a credential other than OIDC. The generated release passes no npm token
and is not edited here, so a maintainer publishes once from their machine,
logged in to npm, with `pnpm nx release publish --first-release` after removing
the `dryRun`.

### 2. Configure npm Trusted Publishing

On npmjs.com, for **each** of `@rn-forge/ng` and `@rn-forge/ng-bootstrap`:
Package Settings → Trusted Publisher → GitHub Actions, with repository
`rn-forge/ngkit`, workflow `ci.yml` and no environment. The release runs as a
reusable workflow (`_release.yml`) called from `ci.yml`, and the OIDC token
names the calling workflow; the `release` job in `ci.yml` and the job in
`_release.yml` both grant `id-token: write`.

After this, that permission is all publishing needs; no npm token in CI ever
again. Provenance attestations are generated automatically. Optionally, once it
works, set each package to require 2FA or automation-only publishing and
disallow classic token publishing.

Open: an internal registry instead of vendored tarballs (a `.verdaccio` config
exists).

## 4. One-time repository setup

- **GitHub Pages.** Repo Settings → Pages → Source: **GitHub Actions**. The
  `docs` job in CI handles the rest.
- **Release GitHub App.** The release pushes the tag as a GitHub App that is a
  bypass actor on the tag ruleset (`GITHUB_TOKEN` cannot bypass it). Install
  the app with Contents read & write on the repository, add it as an `Always`
  bypass actor, and declare the variable `RELEASE_APP_CLIENT_ID` and the
  secret `RELEASE_APP_PRIVATE_KEY` at organization or repository level. Use no
  deploy key or personal access token.
- **Branch protection.** Branch protection on `main` requires the `ci-ok` status
  check and nothing else. The release commits nothing, so `main` needs no
  bypass for it.
- **Other variables and secrets.** `USE_NX_CLOUD`, `NX_CLOUD_AGENTS`,
  `NX_CLOUD_ACCESS_TOKEN` and `SONAR_TOKEN`
  ([what a repository declares](../architecture/release-pipeline.md#what-a-repository-declares)).
