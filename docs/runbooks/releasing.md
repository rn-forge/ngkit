# Releasing

`@rn-forge/ng` and `@rn-forge/ng-bootstrap` release together, at the same version, even if only one changed. They distribute as tarballs attached to GitHub Releases; npm publishing is disabled ([ADR-0003](../adr/ADR-0003.md)). How the pipeline works is in [Release pipeline](../architecture/release-pipeline.md).

## 1. Cutting a release

Run from the Actions tab: **Release** → Run workflow, from ref `main`. The inputs, from `.github/workflows/release.yml`:

| Input           | Meaning                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| `specifier`     | Version bump: `patch`, `minor` or `major`.                                               |
| `exact-version` | Overrides the bump; leave empty normally.                                                |
| `dist-tag`      | `latest` for releases from `main`; `v<major>-lts` for hotfixes to older majors.          |
| `dry-run`       | Default `true`: no commit, tag or publish.                                               |
| `first-release` | Only when no git tag exists yet. Tags `v0.1.0` to `v0.1.2` exist, so leave it unchecked. |

1. **Dry run first**, and inspect the logs: version bump, changelog preview, publish preview. Any release other than a routine patch you have done before needs this.
2. Re-run with `dry-run: false`.
3. Verify:
   - the tag `v<version>` exists;
   - the GitHub Release exists for it, with both tarballs attached;
   - the `published-install` job passed (it installs the tarballs downloaded from that release);
   - the rolling `latest` release points at it (main releases only);
   - `CHANGELOG.md` has an entry for it (see [Breaking changes](#2-breaking-changes));
   - `libs/ng/package.json` and `libs/ng-bootstrap/package.json` on `main` both show the new version;
   - `ng-bootstrap`'s `peerDependencies["@rn-forge/ng"]`, in source and in the tarball, is pinned to the exact new version, not a `^` range.

If a release fails, rerun **Release** from the same ref with the same inputs. A failure before the push leaves nothing public, and the rerun starts the same version again. After the push, the rerun finds the tag on `HEAD` and finishes that version (rebuild, GitHub Release, `latest`) instead of bumping; once the release is published, a rerun only repairs `latest`. If `published-install` fails, the release is already public: fix forward with a new release.

## 2. Breaking changes

A breaking change reaches `CHANGELOG.md` only if `nx release` finds it in a commit. `nx.json#release.changelog` sets only `workspaceChangelog.createRelease: false`, so Nx's default changelog generation applies, which reads [Conventional Commits](https://www.conventionalcommits.org/) messages: a `type(scope): subject` header, with a `BREAKING CHANGE:` footer or a `!` after the type marking a break. This repository's commits are mostly not conventional, and `CHANGELOG.md`'s `0.1.2` entry reads "This was a version bump only, there were no code changes."

So, before a release that carries breaking changes, **do one of these** and check the dry-run changelog preview shows them:

- put a `BREAKING CHANGE:` footer in a conventional commit that lands on the release branch; or
- edit `CHANGELOG.md` and the GitHub Release notes by hand after the release (the notes come from `CHANGELOG.md` at release time).

The release page ([Release 1](../releases/release-1/index.md#breaking-changes-to-announce)) lists what each release must announce.

## 3. Hotfixes to an older major

Cut `release/<major>.x` on demand from the last tag of that major, land the fix on `main` first and cherry-pick back, then release from that branch with `dist-tag: v<major>-lts`. Never use `latest`, which only ever moves on releases from `main`.

Example: `main` is at `v2.3.0`, a consumer needs a critical fix on the `1.x` line (last released as `v1.2.0`).

1. **Cut the maintenance branch from the old tag**, only if it doesn't exist yet:

   ```sh
   git branch release/1.x v1.2.0
   git push origin release/1.x
   ```

2. **Fix forward, pick back.** Land the fix on `main` in a normal PR first, then cherry-pick the commits into a PR against `release/1.x`. CI runs on `release/**` branches the same as `main`. Commit directly to the maintenance branch only if the affected code no longer exists on `main`.
3. **Release from the branch.** Run **Release**, and change the ref in the "Use workflow from" dropdown to `release/1.x`: `specifier: patch` (→ `1.2.1`), `dist-tag: v1-lts`, `dry-run: true` first, then `false`.
4. This releases `1.2.1` for **both** libraries, tags `v1.2.1` on `release/1.x` and writes a changelog entry there, without moving the rolling `latest` release or touching `main`'s history.

| Source branch       | dist-tag       |
| ------------------- | -------------- |
| `main`              | `latest`       |
| `release/<major>.x` | `v<major>-lts` |

**Double-check `dist-tag` before a hotfix.** Only critical and security fixes go to maintenance branches; features land only on `main`. A maintenance branch lives as long as its major is supported and is never merged back into `main`.

## 4. Re-enabling npm

npm publishing is disabled by the hardcoded `dryRun: true` on both libraries' `nx-release-publish` targets. To re-enable it, remove that `dryRun` and set up npm Trusted Publishing (GitHub Actions OIDC, no long-lived token) per package on npmjs.com.

Resume does not yet retry a failed npm publish: once the GitHub Release is published, a rerun skips the publish step, so a failed publish needs a manual `nx release publish`.

### 1. Bootstrap the first publish

npm's Trusted Publisher feature requires a package to already exist on the registry before it can be configured, so the very first publish of each package needs a classic token:

1. Add a temporary repo secret `NPM_TOKEN` (an npm granular automation token with publish access to `@rn-forge/ng` and `@rn-forge/ng-bootstrap`).
2. Temporarily add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` to the `Publish` step's `env` in `.github/workflows/release.yml`.
3. Run a release ([step 1](#1-cutting-a-release)) with the `dryRun` removed.
4. Once both packages exist on npm, complete step 2 below, then **delete the `NPM_TOKEN` secret and remove the `NODE_AUTH_TOKEN` line** from the workflow.

Alternative: a maintainer publishes once from their machine with `pnpm nx release publish`.

### 2. Configure npm Trusted Publishing

On npmjs.com, for **each** of `@rn-forge/ng` and `@rn-forge/ng-bootstrap`: Package Settings → Trusted Publisher → GitHub Actions, with repository `rn-forge/ngkit`, workflow `release.yml`, and no environment.

After this, the workflow's `id-token: write` permission is all that publishing needs; no npm token in CI ever again. Provenance attestations are generated automatically. Optionally, once it works, set each package to require 2FA or automation-only publishing and disallow classic token publishing.

Open: an internal registry instead of vendored tarballs (a `.verdaccio` config exists).

## 5. One-time repository setup

- **GitHub Pages.** Repo Settings → Pages → Source: **GitHub Actions**. The `docs` job in CI handles the rest.
- **Branch protection.** If `main` has branch protection or rulesets blocking direct pushes, add the release GitHub App (Contents read & write, installed on the repository) as an `Always` bypass actor so the release commit can be pushed, and declare `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY` at organization or repository level. Use no deploy key or personal access token. Branch protection on `main` and `release/**` requires the `ci-ok` status check and nothing else.
