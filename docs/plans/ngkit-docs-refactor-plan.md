# ngkit docs refactor — implementation plan

**Written:** 2026-09-26 · **For:** the implementing agent · **Owner review:** at the
three stop points below

This plan moves every piece of ngkit documentation into the shared rn-forge docs
structure: `architecture/`, `guides/`, `runbooks/`, `reference/`, `releases/`, `specs/`
and `adr/` under `docs/`. It covers everything under `docs/`, plus the root and
library READMEs, `CLAUDE.md`, and every code comment or script that points into
`docs/plans/`.

**This file is temporary.** The owner deletes it after the refactor. No page, README,
code comment or config may link to it or name it. Everything worth keeping must end
up in one of the areas above. If something has no home and is not listed as dropped
below, stop and ask; don't invent a place for it.

**Everything you need is in this repository.** The rules for each area are in
Appendix A, and the page shapes are in Appendix B. Don't read, copy from or link to
other repositories.

---

## 0. Read first

1. Read this whole plan, appendices included, before editing anything.
2. Read `CLAUDE.md` and `README.md`.
3. The five source files are `docs/plans/ngkit-roadmap.md`,
   `docs/plans/ngkit-agent-guide.md`, `docs/plans/ngkit-generators-plan.md`,
   `docs/plans/cims-extraction-plan.md` and `docs/plans/cims-adoption-plan.md`. §6
   refers to their sections by heading.

### Rules for the whole refactor

- **Docs only.** Don't change code behavior, public APIs, dependencies, `nx.json`,
  `project.json` targets or workflows. The only code edits allowed are the comment and
  string edits listed in §7.3.
- **Don't add dependencies.** That includes MkDocs and markdown linters. The docs are
  plain Markdown read on GitHub (decision D1).
- **Self-contained.** ngkit's docs record every finding and requirement in their own
  words. They don't depend on another repository's pages, paths or URLs. In
  particular:
  - **No pykit, no CIMS.** Neither name appears anywhere in `docs/`, the READMEs,
    `CLAUDE.md`, `AGENTS.md`, `libs/`, `apps/` or `tools/`. Where a source says "pykit
    does X", write the requirement X as ngkit's, or drop it if it is only about pykit.
    Where a source says "CIMS has Y", write "a 2026-09 survey of an existing Angular
    Material application found Y". §6.10 lists every known occurrence and its
    rewrite.
  - **No other repository's spec IDs, section numbers or statuses:** `R7`, `F4.5`,
    `S9.7.1`, "§7", "api-conventions.md" and the like. Drop the roadmap's "pykit
    dependency map" section entirely.
  - **kiln may be named, without a path or link, in exactly two places:** ADR-0007 and
    `docs/specs/_structure.md`. Their text is given in this plan; use it as written.
  - A dependency on another repository's software is stated as something observable
    from outside it: a version or git ref, or a behavior on the wire. The pin itself
    lives in the manifest or lockfile of the code that uses it, not in the docs.
- **Don't mention archetypes, `node-lib` or how ngkit relates to repository generation
  anywhere** (decision D2).
- **Keep content; drop only what §6 lists as dropped.** Copy prose and move it rather
  than paraphrasing, except for the rewrites this plan names. Fix a statement that's
  now false only where this plan names it; list any other one in your report instead.
- **Links:** use relative links between pages under `docs/`. Use absolute
  `https://github.com/rn-forge/ngkit/blob/main/…` URLs in anything that leaves the
  repository: `libs/**/README.md` (they ship in the npm tarball) and
  `docs/guides/building-an-app.md` (it's pasted into other agents' contexts). No link
  may point to another repository.
- **Formatting:** run `pnpm exec prettier --write` on each Markdown file you create or
  edit. `.prettierignore` skips files named `README.md`, so keep those by hand in the
  existing style.
- **Don't commit** unless the owner asks. If asked, commit one phase per commit.

### Stop points (owner review)

1. After Phase 2 (ADRs): decisions are the part most likely to need correcting.
2. After Phase 5 (specs): check the epic map and the statuses.
3. Before Phase 8 (deleting the source plans).

---

## 1. Decisions

Each decision has a default. Proceed on the default unless the owner has overridden
it.

| ID  | Decision                                                                           | Default                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | How the docs are published                                                         | **Plain Markdown in the repo, read on GitHub. No MkDocs.** The GitHub Pages site stays Storybook plus Compodoc; its landing page gains one link to the docs tree (§7.4). `reference/` is a hand-written index pointing at those generated sites.                                                                  |
| D2  | Whether ngkit records that it is the reference for any future repository archetype | **No. Answered by the owner on 2026-09-26: nothing is documented.**                                                                                                                                                                                                                                               |
| D3  | How other repositories and surveyed apps appear                                    | **Owner, 2026-09-26: they don't, except kiln as described under "Self-contained".** Survey findings are kept in full as ngkit requirements, attributed to "a 2026-09 survey of an existing Angular Material application". No filesystem paths, the surveyed app's screen lists, domain rules or effort estimates. |
| D4  | Scope of release-1                                                                 | **The done work not yet released:** E2, E3, and E4's F4.1 and F4.2. F4.3 (wire acceptance) stays unassigned until its decisions are made.                                                                                                                                                                         |
| D5  | Status of the OIDC decision (ADR-0006)                                             | **`proposed`.** The plan decided the roles, but no code exists and the browser-client-or-BFF question (S5.1.1) is open.                                                                                                                                                                                           |
| D6  | What stays in `CLAUDE.md`                                                          | **Agent instructions and invariants only.** It shrinks to one-line invariants with links; the descriptions move to `architecture/` and `runbooks/` (§7.2).                                                                                                                                                        |

---

## 2. Target tree

```text
AGENTS.md                              new: pointer to CLAUDE.md (Appendix B.8)
CLAUDE.md                              trimmed (§7.2)
README.md                              trimmed, links fixed (§7.1)
docs/
  _areas.yml
  _structure.md
  index.md
  adr/
    _structure.md  index.md
    ADR-0001.md   standards and proven libraries first; ngkit wraps, never reimplements
    ADR-0002.md   package boundaries are one-way; dependency classes and the tested Angular range
    ADR-0003.md   ng and ng-bootstrap release together; tarballs on GitHub Releases
    ADR-0004.md   ngkit ships no HTTP client; applications use HttpClient
    ADR-0005.md   the resource screen targets published wire standards, not a backend
    ADR-0006.md   the SPA is an OIDC client; the identity provider issues tokens (proposed)
    ADR-0007.md   ngkit's docs follow the shared rn-forge docs standard
  architecture/
    _structure.md  index.md
    workspace.md           projects, entry points, dependency direction, source map
    configuration.md       the ConfigurableComponent options model
    core.md                browser storage rules and other core behavior worth stating
    resource-screen.md     @rn-forge/ng/crud + ng-bootstrap/crud: standards, contract, split, wire mapping, UX rules
    release-pipeline.md    build-once dist, versioning, pack, verify scripts, CI toggle, docs site
  guides/
    _structure.md  index.md
    building-an-app.md     the agent guide, migrated
    http.md                the application HTTP pattern and OpenTelemetry setup
    development.md         commands, checks, coverage, adding an entry point or a library, PR rules
  runbooks/
    _structure.md  index.md
    releasing.md           running a release, hotfixes, re-enabling npm, first-time setup
  reference/
    _structure.md  index.md   links to Storybook, Compodoc and the library READMEs
  releases/
    _structure.md  index.md
    release-1/index.md
  specs/
    _structure.md  index.md
    epics/
      E1-packaging-and-compatibility/index.md
      E2-retire-http-entry-point/index.md
      E3-core-correctness/index.md
      E4-standard-resource-screen/index.md
      E4-standard-resource-screen/F4.1-crud-entry-point.md
      E4-standard-resource-screen/F4.2-bootstrap-renderer-and-demo.md
      E4-standard-resource-screen/F4.3-wire-acceptance.md
      E5-oidc-client-auth/index.md
      E5-oidc-client-auth/F5.1-client-model.md
      E5-oidc-client-auth/F5.2-auth-wrapper.md
      E5-oidc-client-auth/F5.3-bootstrap-auth-ui.md
      E5-oidc-client-auth/F5.4-auth-acceptance.md
      E6-asynchronous-resource/index.md
      E7-theme-controller/index.md
      E8-tailwind-package/index.md
      E9-presentation-primitives/index.md
      E10-connected-menu/index.md
      E11-workspace-generators/index.md
      E11-workspace-generators/design.md
      E11-workspace-generators/F11.1-ng-plugin.md
      E11-workspace-generators/F11.2-nx-plugin.md
      E11-workspace-generators/F11.3-create-workspace-cli.md
      E12-on-demand-features/index.md
docs/plans/                            removed in Phase 8, except this file (owner deletes it)
```

Epic IDs are new and permanent. They don't reuse the roadmap's H/E/T labels (the
roadmap's "E1"/"E2" become E6/E7). Each epic index records its former roadmap label
once, in its `**Source:**` line ("former roadmap item H4"). That is the only place old
labels may appear. A `**Source:**` line never names a plan file.

---

## 3. Phase 1 — Skeleton

1. Create `docs/_areas.yml`:

   ```yaml
   # The areas of ngkit's docs tree, in reading order. See _structure.md.
   version: 1
   areas:
     - key: architecture
       title: Architecture
       nav: children
     - key: guides
       title: Guides
       nav: children
     - key: runbooks
       title: Runbooks
       nav: children
       optional: true
     - key: reference
       title: Reference
       nav: index-only
     - key: releases
       title: Releases
       nav: index-only
     - key: specs
       title: Specs
       nav: index-only
     - key: adr
       title: Decisions
       nav: index-only
   ```

2. Create `docs/_structure.md` and each area's `_structure.md` from Appendix A,
   verbatim.
3. Create each area's `index.md` (Appendix B.1): an H1, one or two sentences on what
   the area holds, and a list of its pages in reading order. Add each page's line in
   the phase that creates the page.
4. Create `docs/index.md` (Appendix B.2).
5. Create `AGENTS.md` (Appendix B.8).

---

## 4. Phase 2 — ADRs

Shape: Appendix A.2 and B.3. Date each ADR from when the choice was made, taken from
git:

```sh
git log --format='%ad %h' --date=short -S '<a distinctive phrase>' -- <file> | tail -1
```

When the source text gives a date ("decided 2026-09-23"), use that. `docs/adr/index.md`
is a table: Decision (linked title) | Scope | Status.

| ADR  | Title (states the decision)                                                                             | Status                        | Built from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0001 | Standards and proven libraries come first; ngkit wraps, never reimplements                              | accepted                      | README "Design principles": the Goal (**without** "These are the same principles as pykit…"), principles 1, 2 and 4, the paragraph "These principles apply…", the three hand-roll cases numbered 1–3 (code cites them as "exemption 1/3"), and the six wrapper rules. Principle 4's example becomes: "Surveys of existing applications are prior art that informs the design, not compatibility constraints." Consequences: a deviation is recorded in the feature's Design or the doc comment; `@nx/dependency-checks` and `ng:verify-consumer` catch leaked dependencies. Alternatives: hand-rolling by default; "zero dependencies" as a goal.                                                                                                                                                                                                                                                                                                                        |
| 0002 | Package boundaries are one-way; presentation libraries only render                                      | accepted                      | README principle 3 in full; roadmap H4.3's opening paragraph ("Presentation-free state and behaviour go into `ng` now… a presentation library only renders"); H1's dependency split (implementation libraries are `dependencies` via `allowedNonPeerDependencies`; framework packages stay peers); the supported Angular range is the tested matrix (22.0.6/22.1.7 × zone/zoneless), with a caret range because there are no external consumers yet and "bump a peer floor only on purpose, together with the matrix" (completion record, "Fixed during review"). Consequences: no lint enforces entry-point direction yet (`@nx/enforce-module-boundaries` has no tag constraints), so review does. Alternatives: a hand-built `>=22.0.6 <23` bound; leaving implementation libraries as mandatory peers.                                                                                                                                                               |
| 0003 | `ng` and `ng-bootstrap` release together under fixed versioning and ship as tarballs on GitHub Releases | accepted                      | `CLAUDE.md` "Publishing & release": fixed/grouped versioning (the model Angular uses for `@angular/*`); exact internal peer pins; tarballs on GitHub Releases plus the rolling `latest`; npm disabled by a hardcoded `dryRun: true`, with Trusted Publishing as the route back; hotfix branches with `v<major>-lts` dist-tags. The mechanics go to `architecture/release-pipeline.md`, linked from Influences. Alternatives: independent versions per library; npm with a long-lived token.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 0004 | ngkit ships no HTTP client; applications use Angular's `HttpClient`                                     | accepted, 2026-09-23          | Roadmap H2R intro and H2R.0 (the authority rules) as the Decision. **Rewrite** H2R.0's "Do not mention or detect Python, Django, DRF, FastAPI or pykit behavior in ngkit" as "Do not mention or detect any backend framework or server library in ngkit code." H2R.5's "Generic CRUD client. Not in `ng`" paragraph as Consequences, up to "…justify a separately named adapter package" (the rest is ADR-0005). H2R.1 and "do not rename it, generalize it or add a second basic client" as Alternatives considered. Telemetry is deferred work (F12.1), not part of this ADR.                                                                                                                                                                                                                                                                                                                                                                                          |
| 0005 | The resource screen targets published wire standards, not a backend                                     | accepted, 2026-09-23          | Decision: "The screen is a client of the wire standards: RFCs first, then Google's API Improvement Proposals where no RFC applies. It works against any backend that follows them, and nothing in it names or detects a backend." Keep the order of authority (standard, then Angular's mechanism, then an ngkit wrapper). Consequences: a backend with its own envelope adapts inside the app's own data source, and ngkit ships no adapter (H4.2 "Legacy backends…", rewritten per §6.10); `standardDataSource()` is the implementation for standards-following backends ("decided 2026-09-23; revisit if usage drifts across apps"); AIP + RFC is a published convention, not a backend dialect, which is why the screen's interface belongs in ngkit while a generic REST client doesn't (end of H2R.5's CRUD bullet). Influences: `architecture/resource-screen.md`, E4. Alternatives: an envelope adapter for one framework in ngkit; a generic `RestResource<T>`. |
| 0006 | The SPA is an OIDC client; the identity provider signs users in and issues tokens                       | **proposed** (D5)             | H5.2 in full, rewritten per §6.10. Consequences: H5.1's list of what the current custom layer does wrong is why `@rn-forge/ng/auth` is replaced (E5). Influences: E5. Alternatives: the current custom login `POST` with tokens in `localStorage`; implicit flow; password grant.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 0007 | ngkit's docs follow the shared rn-forge docs standard                                                   | accepted, the refactor's date | Use Appendix B.4 as written.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## 5. Phases 3 and 4 — Architecture, guides, runbook and reference

Every page states current behavior, in the present tense. When the source is a plan
("do X", "add Y"), rewrite it as a description of what exists ("X does Y"). Check each
claim against the code before writing it: open the file it names. If the code
disagrees, the code wins; note the mismatch in your report.

### 5.1 `architecture/workspace.md`

- Projects table (the README's "Projects" table).
- The entry-point table from the agent guide §1 (package → secondary entry points →
  what it gives you), and its "Source path map" code block from §0.
- Dependency direction: one paragraph linking ADR-0002.
- Nx targets worth knowing, one line each: `pack`, `verify-consumer`,
  `patch-package-exports`, `compodoc`, `build-storybook`, `e2e-ci`. Check each exists
  with `pnpm nx show project <name> --json` first.

### 5.2 `architecture/configuration.md`

The agent guide §4: the first paragraph and the four bullets on
`ConfigurableComponent` (`[options]`, `[htmlAttributes]`, `configKey`, resolution
order), and the Pages paragraph (`AbstractPage` vs `AbstractAuthPage` as a dependency
boundary). The agent guide keeps its own copy of §4 because it's pasted whole into
other contexts. This page is the maintainer's version and can add source file paths.

### 5.3 `architecture/core.md`

- **Browser storage:** roadmap H3.1's "Public surface" code block and method table, the
  one-line common-call example, and Rules 1–6, restated as behavior. Keep the rule that
  auth and ng-bootstrap use the strict methods on purpose, so a failed auth-token write
  still throws. Drop "Files", "Out of scope", "Tests", "Acceptance" and "Done" (the
  spec file and git hold them).
- **Utilities:** the five H3.2 bullets as current semantics (`DateUtil` local vs UTC;
  `FormUtil` validators run on pristine values, with the empty rule and `DATE_RANGE` as
  a group validator; `ObjectUtil.diff` comparison rules; `HtmlAttributesDirective`;
  `RouteService.navigateByUrl`). Drop "breaking, in place" wording; the release page
  carries the breaking notes.

### 5.4 `architecture/resource-screen.md`

Sections, in order:

1. **Standards** — H4.1's table, with columns UI concern | Standard. **Drop the "pykit
   status" column** and everything else in H4.1 after the table. Add one line: "The
   screen sends one `orderBy` field. AIP-132 allows several, but servers may reject
   more than one." Link ADR-0005.
2. **Data-source contract** — H4.2, rewritten in the present tense. Keep the
   `ListRequest`, `ListResponse` and `Versioned` shapes and the optional-method feature
   detection. Drop "Remove `count`/`next`/…" (history; the release page covers it)
   and the "Legacy backends" bullet (it is in ADR-0005).
3. **Package split** — H4.3's bullets, as what each entry point holds now. Take the
   exports from `libs/ng/crud/src/index.ts`, not from the plan.
4. **`standardDataSource()` wire mapping** — H4.3's example, wire table and Rules,
   rewritten per §6.10.
5. **Screen behavior** — H4.4's bullets. **Correct one:** "Handle the partial-save 200
   variant (R7 Q1)" becomes "A backend may answer an import with 200 and an `errors`
   list (partial save); the screen shows those errors."
6. **Implementation notes** — from the completion record's H4.5 part:
   `createCrudList()` is a function on `rxResource`, not an injectable, because the
   data source belongs to one screen; errors land as `{ server: string[] }`; the 412
   flow (`manager.conflict` + `reloadConflict()`, which re-reads the row for its
   `ETag` and keeps the edits; update reads the row fresh first); `null` filter values
   are dropped like `undefined`; `features.importTemplate` is a boolean and
   `features.export` a non-empty format list; `ImportReport.errors` is optional; the
   table renders one server page (`sidePagination: 'server'`, `pagination: false`,
   refresh off).
7. **Cross-origin downloads** — "A browser can read `Content-Disposition`, and so the
   export or template file name, only when the backend lists it in
   `Access-Control-Expose-Headers`. Without it, `fileNameFrom()` returns no name." Check
   the no-name behavior in `crud.files.ts` and state what actually happens.

### 5.5 `architecture/release-pipeline.md`

- From `CLAUDE.md` "Publishing & release": every bullet except the decisions (fixed
  versioning, exact pins, tarballs over npm, hotfix policy; those are ADR-0003). That
  is: `dist/` built once by `preVersionCommand`, and why the Publish and Pack steps
  pass `--excludeTaskDependencies`; the `manifestRootsToUpdate` pair and why;
  `createRelease: "github"` is what makes `nx release` push; the
  `preserveLocalDependencyProtocols: false` guard; `patch-package-exports` and when it
  runs.
- From the completion record's H1 part: `verify-consumer.mjs` (four fixtures under
  `dist/consumer-fixtures/`, Angular 22.0.6 and 22.1.7 × zone/zoneless, every entry
  point smoke-tested, no `workspace:` protocol) and `resolve-dist-workspace-deps.mjs`
  (why plain `nx pack` needs it; a no-op after `nx release version`). Take the current
  entry-point list from the script, not the plan: `./http` is gone and `./crud` was
  added.
- From `CLAUDE.md` "CI" and the README "CI" section: the `ci-cloud`/`ci-local`/`package`
  toggle and the `e2e-ci` atomization.
- From `CLAUDE.md` "Docs site": how Pages assembles `dist/site/`.

### 5.6 `guides/building-an-app.md`

Move `docs/plans/ngkit-agent-guide.md` here with `git mv`, then make these edits:

- §5.3: "Rationale: `docs/plans/ngkit-roadmap.md` H2R" becomes an absolute link to
  ADR-0004. "OpenTelemetry setup: plan H2R.4" becomes an absolute link to
  `docs/guides/http.md#telemetry-versions-checked-2026-09-22`.
- §0 "Source path map": the `libs/ng/crud/src/` row is misaligned; align it with the
  other rows.
- Change nothing else. It is current as of H4.5. (It names neither pykit nor CIMS;
  check that this is still true.)

### 5.7 `guides/http.md`

- **Application HTTP pattern:** roadmap H2R.3 in full (tokens per backend, operation
  clients, three error layers with the interceptor example, query strings and
  downloads, deployment note). Drop "Record this where consumer guidance lives…" (a
  plan instruction). Change "(H2R.4)" to a link to the Telemetry section, and
  "H2R.0's serialization and error-representation rules" to a link to ADR-0004.
- **Telemetry (versions checked 2026-09-22):** H2R.4 in full: the snippet and every
  constraint.

### 5.8 `guides/development.md`

- **Commands:** the README's "Run tasks" and "Add new projects" sections.
- **Checks before a PR:** the roadmap's "Library checks" and "Coverage" paragraphs.
  Coverage covers `core`, `auth` and `crud`; confirm against `coverageInclude` in
  `libs/ng/project.json`. Add the delivery-sequence rule: "Each PR names its source
  files, public exports and test evidence."
- **Adding a secondary entry point:** the CIMS extraction plan's "I-0" steps 1–6,
  updated: mirror `libs/ng/crud/` or `libs/ng/auth/`, not `libs/ng/http/`. Add step 7,
  "add the entry point to `tools/scripts/verify-consumer.mjs`'s matrix" (from H4.5
  step 1). Drop its note about `nx.json#release`; `release.projects` exists now.
- **Adding a publishable library:** merge the "For a new library" paragraph of I-0
  (use neutral example names instead of `ng-material`/`ng-charts`); the `CLAUDE.md`
  bullets that say a new publishable library needs something (`release.projects`, the
  `manifestRootsToUpdate` pair, package metadata, the `patch-package-exports` pattern
  for asset-shipping libraries, an `api/<name>/` entry on the docs site); and the
  release bullets of roadmap T1 (`preVersionCommand`, `dryRun`, pack without rebuild,
  CI package verification, Storybook/API docs entry). One ordered checklist, no
  duplicates.

### 5.9 `runbooks/releasing.md`

Ordered steps with the decision points called out:

1. **Cutting a release:** the `release.yml` `workflow_dispatch` inputs (`specifier`,
   `exact-version`, `dist-tag`, `dry-run`, `first-release`), read from the workflow
   file. Dry run first, inspect, then run for real. What to verify afterwards: the
   tag, the GitHub Release with both tarballs, the rolling `latest` release,
   `CHANGELOG.md`, the source `libs/*/package.json` versions, and the exact internal
   peer pin.
2. **Breaking changes:** how a breaking change reaches `CHANGELOG.md`. Check how
   `nx release` builds the changelog (`nx.json#release.changelog`) and write down what
   it actually needs. This repository's commits are not conventional commits, so say
   plainly whether the changelog has to be edited by hand at release time.
3. **Hotfixes to an older major:** the `CLAUDE.md` bullet.
4. **Re-enabling npm:** the `CLAUDE.md` bullet (remove the hardcoded `dryRun`, set up
   Trusted Publishing), expanded with sections "1. Bootstrap the first publish" and
   "2. Configure npm Trusted Publishing" of this repository's old releasing doc.
   Recover it with `git show backup/main-before-rewrite:docs/RELEASING.md`. Check every
   step against the current `release.yml` before copying it. Add one line: "Open: an
   internal registry instead of vendored tarballs (a `.verdaccio` config exists)."
5. **One-time repository setup:** sections "3. GitHub Pages" and "4. Branch protection"
   of the same old doc.

Recover nothing else from it: "First release" has been done (tags `v0.1.0`–`v0.1.2`
exist). Also read `git show backup/main-before-rewrite:docs/specs/release-and-cicd.md`;
move anything in it that is still true and not already covered into
`architecture/release-pipeline.md`, and list what you took in your report.

### 5.10 `reference/index.md`

Links to Storybook (`https://rn-forge.github.io/ngkit/storybook/`), Compodoc for each
library (`…/api/ng/`, `…/api/ng-bootstrap/`) and each `libs/**/README.md`, one line
each.

---

## 6. Phase 5 — Specs (and where every section of the source plans goes)

Shapes: Appendix A.8 and B.5–B.6.

### 6.1 Epic map

| Epic                                 | Status                       | Source                                                            | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1 — Packaging and compatibility     | done, 2026-09-20 (`c30d63a`) | roadmap H1                                                        | Features F1.1 Angular peer range and the consumer matrix (`verify-consumer`); F1.2 implementation dependencies moved out of mandatory peers; F1.3 `workspace:` protocol resolved in packed manifests. H1's bullets are what it delivered; turn "Done: …" into the summary paragraph. Rejected: a hand-built upper bound; verdaccio and a workspace fixture for the consumer test. Link `architecture/release-pipeline.md` and ADR-0002.                                                                         |
| E2 — Retire the HTTP entry point     | done, 2026-09-23 (`c30d63a`) | roadmap H2R, and the completion record's "H2 + H2R" part          | Features F2.1 `libs/ng/http/**` removed, with no aliases; F2.2 `AuthBackendService` on native `HttpClient`, with `backend.baseUrl` enforced at construction; F2.3 `saveBlob` added and the demo moved to an app-owned token. One sentence: the interim `ng-bootstrap/crud` `CrudDataSource` was superseded by E4. Rejected: from H2R.1. Link ADR-0004 and `guides/http.md`.                                                                                                                                     |
| E3 — Core correctness                | done, 2026-09-23 (`1f54842`) | roadmap H3                                                        | Features F3.1 safe browser storage; F3.2 `DateUtil`, `FormUtil`, `ObjectUtil.diff`, `HtmlAttributesDirective`, `RouteService`. Rejected: `ngx-webstorage` and `@ngx-pwa/local-storage`, with H3.1's reasons. Note that CRUD and auth moved to E4 and E5. Link `architecture/core.md`.                                                                                                                                                                                                                           |
| E4 — Standard resource screen        | in progress                  | roadmap H4                                                        | §6.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| E5 — OIDC client auth                | elaborating                  | roadmap H5                                                        | §6.3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| E6 — Asynchronous resource           | deferred                     | roadmap "E1"                                                      | Entry criteria: the owner schedules it. Design: the whole section (contract, requirements 1–5). Open question: reconcile its entry point with `@rn-forge/ng/crud`, which already uses `rxResource` (from the delivery-sequence paragraph).                                                                                                                                                                                                                                                                      |
| E7 — Theme controller                | deferred                     | roadmap "E2", plus the CIMS extraction plan's A-4, "R3" and "I-4" | Entry criteria: the owner schedules it. Depends on E3 (done). Design: the roadmap section in full, rewritten per §6.10; then a "Prior art" subsection with I-4's `ColorModeService` design and R3's requirement (decouple `rnf-color-mode` from `UserSettingsService` in `ng-bootstrap/auth`, so a no-auth app doesn't pull in the auth UI). Open question: one service, not a `ThemeService` and a `ColorModeService`. Settle its name, and whether to accept an `auto` spelling for `system` at the boundary. |
| E8 — `@rn-forge/ng-tailwind` package | deferred                     | roadmap T1                                                        | Entry criteria: the owner schedules it. Design: T1 in full, except its release-config bullets, which move to `guides/development.md` (link that section). Open question: E8 and F12.10 (`ng-material`) each add a second presentation package; decide whether both are wanted.                                                                                                                                                                                                                                  |
| E9 — Presentation primitives         | deferred                     | roadmap T2                                                        | Entry criteria: E8 is done and the owner schedules it. Design: T2 in full.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| E10 — Connected menu                 | deferred                     | roadmap T3                                                        | Entry criteria: E8 is done and the owner schedules it. Design: T3 in full.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| E11 — Workspace generators           | elaborating                  | the generators plan                                               | §6.4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| E12 — On-demand features             | deferred                     | roadmap H2R.5 and the CIMS extraction plan                        | §6.5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**Done epics** (E1–E3): the "Verified with" line lists the commands from the
completion record, without numbers.

### 6.2 E4 — Standard resource screen

`index.md`: status `in progress`; a one-paragraph summary; links to ADR-0005 and
`architecture/resource-screen.md`; the feature table; one sentence from "H4/H5 owner
decisions" item 2: "Decided 2026-09-23: `ng-bootstrap/crud` is rewritten on the new
controller, not kept alongside it."

- **F4.1 — `@rn-forge/ng/crud` entry point** · done · implemented 2026-09-23
  (`94faba0`). Stories S4.1.1–S4.1.5 are H4.5 steps 1–5, each `done (2026-09-23)`.
  Each story's acceptance is its step's "Tests:" and "Checks:" text, as result lines
  ("… passes"). Put the step's design detail under `## Design`, pointing at
  `architecture/resource-screen.md` rather than repeating it.
- **F4.2 — Bootstrap renderer and demo** · done · implemented 2026-09-23 (`94faba0`).
  S4.2.1 and S4.2.2 are H4.5 steps 6 and 7, the same way. Note that the two steps were
  written together and verified as a whole.
- **F4.3 — Accept the screen against a real backend** · elaborating. Built from roadmap
  H4.6 and H4.7, **rewritten per §6.10**. Use this content:
  - Summary: "Run `ng-demo`'s e2e suite against a real backend that follows the
    standards in `architecture/resource-screen.md`, in place of the demo's mock
    `/api`. The backend serves one full resource: list with `orderBy`, get, create,
    patch with `ETag`, delete, `:batchDelete`, `:import` (with `validateOnly`),
    `:importTemplate` and export. The fixture is ngkit's own test code, like the
    consumer fixtures of `ng:verify-consumer`."
  - **Depends on:** "A server library, pinned by version or git ref, that implements
    every row of the standards table and installs outside its own repository. The pin
    lives in the fixture's own manifest."
  - S4.3.1 **Choose the fixture's stack** (decision). Acceptance: the stack and the
    reason are recorded in this feature's Design. Requirement: where the chosen server
    library lacks a handler for one of the operations above, the fixture implements it
    itself, following the standards table.
  - S4.3.2 **Approve Python in CI** (decision). Acceptance: the owner approves the
    `ci.yml` change for the local and cloud paths; the approval is recorded here.
  - S4.3.3 **Backend fixture.** Acceptance: a fixture app in this repository (the
    location is chosen in the PR, e.g. `apps/ng-demo-api/`) serves the resource, and
    the `ng-demo` dev-server proxy puts it on the same origin.
  - S4.3.4 **e2e against the fixture.** Acceptance: `pnpm nx e2e ng-demo-e2e` passes
    against the fixture locally, covering every operation above.
  - S4.3.5 **In CI.** Acceptance: both CI paths run it.
  - Open question: "Export and template file names reach a cross-origin browser only
    when the backend exposes `Content-Disposition`. The fixture runs same-origin
    until the chosen stack does."
  - H4.6's breaking-change bullet goes to the release page, not here.

### 6.3 E5 — OIDC client auth

`index.md`: status `elaborating`; H5.1 as the "Why" paragraph, compressed to its
bullets and rewritten per §6.10; a link to ADR-0006; the feature table; H5.6's
"Breaking-change note: the whole `@rn-forge/ng/auth` surface", as an epic-level line
the release carrying E5 must meet.

- **F5.1 — Client model.** S5.1.1 **Browser client or BFF** (decision): H5.4 in full
  under Design, rewritten per §6.10, plus "H4/H5 owner decisions" item 1 (default:
  browser client + PKCE, BFF-ready). Acceptance: the choice is written into ADR-0006,
  which then moves to `accepted`.
- **F5.2 — `provideRnForgeAuth` wrapper.** S5.2.1 **Choose the OIDC library**
  (decision): H5.3's candidate paragraph and the three things to confirm. S5.2.2 the
  wrapper: H5.3's bullets, from `provideRnForgeAuth(config)` through the no-auth mode,
  under Design. Acceptance: H5.6's unit-test bullet (one line per case), the
  `lint test build` and `verify-consumer` line, and the dependency-placement rule
  (in `allowedNonPeerDependencies`, or an optional peer, decided in the PR).
- **F5.3 — Bootstrap auth UI.** H5.3's `ng-bootstrap/auth` bullet. Acceptance: the
  login page is removed; the user menu and forbidden page exist.
- **F5.4 — Acceptance against an identity provider.** "`ng-demo` against a local
  Keycloak container (code + PKCE) calling a backend fixture that verifies bearer
  tokens through OIDC discovery and JWKS: a missing token is 401 with a challenge, a
  missing scope is 403 without one, and the UI hides actions without the scope."
  **Depends on:** the same kind of pinned server library as F4.3. Reuse F4.3's fixture
  if its stack can verify bearer tokens.
- **Drop H5.5.** It is feedback for another repository, not ngkit work (§10).

### 6.4 E11 — Workspace generators

- `index.md`: status `elaborating`, the Overview (the three scenarios), the feature
  table, and `## Open questions` with the generators plan's seven questions,
  verbatim. Then append these four, which describe drift found on 2026-09-26:
  1. `ng-plugin:setup` steps 4 and 6 add polyfills, scripts and assets to the build
     target, but `provideRnForgeBootstrapConfig()` now loads all vendor scripts at
     runtime and `ng-bootstrap` needs no `scripts`/`polyfills` entries
     (`libs/ng-bootstrap/README.md`). What does `setup` still need to patch?
  2. The file-patching example uses `@rn-forge/ng-bootstrap/styles`; the real entry is
     `@rn-forge/ng-bootstrap/assets/theme`.
  3. `libs/ng-bootstrap/README.md` promises a generator will add
     `allowedCommonJsDependencies`; no generator in this epic does.
  4. The build and publish order runs `nx release --projects=…` over five packages,
     while ADR-0003 releases `ng` and `ng-bootstrap` as one fixed group, as tarballs.
     How do the plugins version and ship?
- `design.md`: "Design decision" (two plugins, the rule of thumb), "Package map" (drop
  the `@rn-forge/ng-bootstrap-tools` row: that package doesn't exist here), "Build &
  publish order", and "Shared implementation standards" (idempotency, project
  detection, file patching, testing).
- `F11.1-ng-plugin.md`: stories S11.1.1–S11.1.5, one per generator in the source order
  (`setup`, `add-bootstrap-table`, `configure-theme`, `scaffold-component`,
  `configure-testing`), status `planned`. Each story's acceptance is its Gherkin block,
  verbatim. The feature's `## Design` has one subsection per generator (Usage, Schema,
  Steps), plus the Location tree and the Generator grouping table. The feature's
  `## Open questions` has one subsection per generator with its "Requirement
  discussion" table.
- `F11.2-nx-plugin.md`: the same, for S11.2.1–S11.2.6 (`setup-workspace`,
  `create-publishable-lib`, `setup-ci`, `setup-release`, `setup-boundaries`,
  `setup-agentic-coding`).
- `F11.3-create-workspace-cli.md`: S11.3.1. Location, Package metadata, CLI options
  and Execution steps as Design; Requirement discussion as Open questions; the Gherkin
  as acceptance.
- **Drop:** "Migration from old spec", and every sentence saying a generator
  "replaces the old `@rn-forge/nx:…`" or "the legacy `setup-assets`". None of those
  packages exist in this repository (`rg` confirms it).
- Don't add anything about how these generators relate to other rn-forge tooling (D2).

### 6.5 E12 — On-demand features

`index.md`: status `deferred`; entry criteria "the row's trigger occurs"; an intro;
a rows table (ID | Proposal | Trigger); then one `## F12.n — …` section per row that
has design content, holding that content.

Intro, as written: "Proposals that wait for a trigger. When it fires, the row becomes a
feature with stories and acceptance before any code. Rows F12.2–F12.10 come from a
2026-09 survey of an existing Angular Material application, treated as prior art
(ADR-0001): what it hand-rolled that ngkit could supply."

Don't carry the source's labels (`A-3`, `I-3`, `R1`, Tier A/B/C) into the new text;
the row ID replaces them. Rewrite each design per §6.10: no app name, no file paths
of the surveyed app, no inventory domain terms. State its finding as the requirement:
"the survey found six list screens re-implementing filter, search, multi-key sort and
debounce as `computed()` chains".

| Row    | Proposal                                                                 | Trigger                                                                       | Design content from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F12.1  | Optional `@rn-forge/ng/telemetry` entry point                            | Two apps need the same OpenTelemetry setup                                    | Roadmap H2R.5, "Telemetry" bullet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| F12.2  | `CsvUtil` in `ng/core`                                                   | The owner schedules it                                                        | CIMS extraction A-1, I-1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| F12.3  | `DateUtil.relative()`                                                    | The owner schedules it                                                        | A-2, I-2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| F12.4  | `@rn-forge/ng/data`: client-side collection query                        | The owner schedules it                                                        | A-3, I-3, in full (the source's highest-value item)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| F12.5  | `@rn-forge/ng-charts` package                                            | The owner schedules it                                                        | A-5, I-5; decision question 2 (package vs entry point) as its open question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| F12.6  | `@rn-forge/ng/reporting`: headless report definitions                    | A second app needs report definitions                                         | A-6, I-6; decision question 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| F12.7  | `AuditTrailService`                                                      | The owner schedules it                                                        | A-7, I-7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| F12.8  | `CommandRegistry`: a headless command palette                            | The owner schedules it                                                        | A-8, I-8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| F12.9  | Move `ConfigurableComponent` and `ConfigurerService` into `ng/core`      | A second presentation package is scheduled (E8 or F12.10)                     | "R1"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| F12.10 | `@rn-forge/ng-material`                                                  | The owner decides a Material kit is in scope                                  | The Tier B table, I-9, §4's `ng-material` layout, and §5's "two UI packages" bullet and component pitfalls (a breadcrumb snapshotting the route once, `matchMedia` under SSR, a keydown listener with no teardown). Also the adoption plan's §3, as the reason a Bootstrap + jQuery kit doesn't fit a Material app: two CSS frameworks at once, Bootstrap's Reboot resetting Material typography, jQuery loaded globally, and no Bootstrap equivalents for page header, breadcrumb, empty state, skeleton, KPI card, status chip, gauge or grouped side nav. Open questions: decision question 1 (is a Material kit in scope at all), and the E8 cross-reference. Depends on F12.9 and F12.8. |
| F12.11 | A separately named adapter package for another published wire convention | Several backends share a published, versioned convention other than AIP + RFC | The first half of roadmap H2R.5's "Generic CRUD client" bullet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 6.6 Dropped from the CIMS plans

- **Extraction plan:** "Decisions I need from you" item 3 and "R2" (string ids). Both
  are done: `$K extends string | number` is in `@rn-forge/ng/crud`. Also dropped: "What
  was reviewed", Tier C, the package-layout rows for `/http` and `/http/crud` (both
  removed), "Sequencing and estimates" (the dependency facts stay inside the rows),
  and the hand-off notes.
- **Adoption plan:** everything except what F12.10 takes from §3 and the registry
  line in `runbooks/releasing.md`. It is work in another application, and it targets
  entry points that no longer exist.

### 6.7 Roadmap sections not covered above

| Roadmap section                                                             | Destination                                                                                                                                                                |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening status paragraph                                                    | `specs/index.md` board                                                                                                                                                     |
| "Every item follows the Design principles…"                                 | ADR-0001 (the last paragraph of its Decision) and `CLAUDE.md` (§7.2)                                                                                                       |
| "References beginning `pykit:`…", "Preserve unrelated working-tree changes" | Dropped                                                                                                                                                                    |
| "cims-extraction-plan.md and cims-adoption-plan.md are proposals…"          | Dropped; E7 and E12 carry the content                                                                                                                                      |
| "H4/H5 owner decisions"                                                     | Item 1 → S5.1.1; item 2 → E4 index; item 3 → dropped (§10)                                                                                                                 |
| H4.1 after its table ("Open pykit items…", the remap notes)                 | Dropped; the one-field `orderBy` line in §5.4 replaces it                                                                                                                  |
| H4.6's remap bullets, H4.7, H5.5                                            | Dropped; F4.3 and F5.4 carry the ngkit-side requirements                                                                                                                   |
| "pykit dependency map (2026-09-26)"                                         | Dropped                                                                                                                                                                    |
| "Delivery sequence and evidence"                                            | The board's "Next step" column and the epics' dependencies. Its PR rule, "Library checks" and "Coverage" → `guides/development.md`                                         |
| "Completion record"                                                         | Current behavior → architecture (§5.3–§5.5); breaking changes → the release page; evidence numbers dropped (git has them); the H4.6 release-note bullet → the release page |

### 6.8 `specs/index.md`

The board (Appendix B.7). **In progress:** E4, next step "F4.3: decide S4.3.1 and
S4.3.2". **To elaborate:** E5, E11. **Deferred:** E6–E10 and E12, with entry
criteria. **Done:** E1–E3 with dates. Then the Conventions list from B.7.

### 6.9 Checking statements that come from outside

Some source statements describe another repository's behavior ("pykit already
validates the tokens"). They are not ngkit's to assert. Rewrite each as the
requirement ngkit places on any backend, or drop it.

### 6.10 Known pykit and CIMS occurrences, and their rewrites

Line numbers are for the working-tree `ngkit-roadmap.md` at the time of writing; find
each by its text. Run `rg -n -i 'pykit|cims|ew-loop' docs/plans` to catch any not
listed here.

| Where                         | Source text                                                                                                                          | Rewrite                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| README.md:20                  | "These are the same principles as [pykit](…), applied to Angular."                                                                   | Delete the sentence.                                                                                                                               |
| README.md:44                  | "surveys of existing apps (such as CIMS)"                                                                                            | "surveys of existing apps" (the paragraph moves to ADR-0001)                                                                                       |
| Roadmap H2R.0                 | "Do not mention or detect Python, Django, DRF, FastAPI or pykit behavior in ngkit."                                                  | "Do not mention or detect any backend framework or server library in ngkit code." (ADR-0004)                                                       |
| Roadmap H2R.5                 | "AIP + RFC, as pykit's `api-conventions.md` applies them, is that published convention"                                              | "AIP + RFC is that published convention"                                                                                                           |
| Roadmap H4.1                  | "a client of the wire contract, not of pykit. pykit's premise is…", "`pykit:packages/…/api-conventions.md`", "Do not wait on pykit…" | ADR-0005's Decision sentence (§4); the rest is dropped                                                                                             |
| Roadmap H4.2                  | "CIMS's DRF envelope and `ew-loop-api`'s pre-pykit endpoints map into this contract…"                                                | "A backend with its own envelope (for example DRF's `{count, next, previous, results}`) maps into this contract inside the app's own data source." |
| Roadmap H4.3                  | "It targets the standards, not pykit" / "Nothing names or detects pykit; any standards-following backend works."                     | "It targets the standards, not a backend" / "Nothing names or detects a backend; any standards-following backend works."                           |
| Roadmap H5.1                  | "contradicting pykit §7 (403 = authenticated but not allowed)"                                                                       | "contradicting HTTP's meaning of 403: authenticated but not allowed"                                                                               |
| Roadmap H5.2                  | "pykit already does this (`OidcAuthenticator`, `Principal`, §7)"; "(pykit §7)" after basic auth                                      | Delete both; the sentences stand without them                                                                                                      |
| Roadmap H5.4                  | "Needs no new backend; pykit already validates the tokens." / "Needs a BFF component, which pykit does not have."                    | "Needs no new backend component: the API only verifies the tokens." / "Needs a BFF component, which doesn't exist yet."                            |
| Roadmap H5.6                  | "a pykit `FastApiApp` protected by `OidcAuthenticator`"                                                                              | F5.4's text (§6.3)                                                                                                                                 |
| Roadmap "E2" heading and body | "coordinate CIMS ColorModeService"; "adapt CIMS's proposed auto spelling at its boundary"                                            | Drop the heading clause (E7's "Prior art" covers it); "accept an `auto` spelling for `system` at the boundary if an app needs it"                  |
| Generators plan               | none found                                                                                                                           | —                                                                                                                                                  |
| Agent guide                   | none found                                                                                                                           | —                                                                                                                                                  |

---

## 7. Phases 6 and 7 — Releases, root files, code references

### 7.1 `README.md`

- Keep: the title and intro, the Projects table, "Getting started" (two commands),
  "Packing libraries" (fix the links: `docs/RELEASING.md` →
  `docs/runbooks/releasing.md`; `docs/specs/release-and-cicd.md` →
  `docs/architecture/release-pipeline.md`), and "Useful links".
- Replace "Design principles" with the Goal sentence (without the pykit sentence) and
  a four-item numbered list, each item one sentence with an ADR link: standards first
  (0001), package boundaries (0002), releasing together (0003), ngkit is upstream
  (0001). Keep the sentence that principles win unless a deviation is recorded.
- Move "Run tasks" and "Add new projects" to `guides/development.md`, and "CI" to
  `architecture/release-pipeline.md`. Replace them with a "Documentation" section
  linking `docs/index.md`, the specs board, the ADR log and the published site.

### 7.2 `CLAUDE.md`

Keep the Nx section (lines 1–25) unchanged. Rewrite "Project Guidelines":

- **Start here:** read `docs/specs/index.md` (the board) before starting work; place
  docs by `docs/_structure.md`; find content through `docs/index.md`. Don't start or
  elaborate a deferred epic unless the owner asks.
- **Principles:** the ADR log binds every change; a deviation is recorded, with its
  reason, in the feature's Design or the doc comment (replaces the current line 27).
- **Docs are self-contained:** they describe only this repository and name no other
  repository or surveyed application, except kiln in the two places
  `docs/specs/_structure.md` allows.
- **Release invariants,** one line each, linking `architecture/release-pipeline.md`:
  `dist/` is built once by `preVersionCommand` and never rebuilt downstream; publish
  and pack pass `--excludeTaskDependencies`; `nx-release-publish` has no `dependsOn`;
  internal peers are exact pins, never widened by hand; `workspace:*` must not reach a
  dist manifest; npm is disabled (`dryRun: true`); a new publishable library follows
  `guides/development.md#adding-a-publishable-library`.
- **CI** and **Docs site:** one line each, with links.

Check that every invariant in the current "Publishing & release" section is still
there as a line or a link. None may disappear.

### 7.3 Code and config references

| File                                          | Change                                                                                                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/scripts/verify-consumer.mjs:8`         | "See docs/plans/ngkit-roadmap.md (H1)…" → "See docs/architecture/release-pipeline.md."                                                                                  |
| `apps/ng-demo/src/app/shared/api.tokens.ts:5` | `docs/plans/ngkit-roadmap.md` H2R.3 → `docs/guides/http.md`                                                                                                             |
| `libs/ng/crud/src/lib/crud.standard.ts:60`    | `docs/plans/ngkit-roadmap.md` H4.1 → `docs/architecture/resource-screen.md`                                                                                             |
| `libs/ng/core/src/lib/core.utils.ts:81`       | "(README exemption 3)" → "(ADR-0001 exemption 3)"                                                                                                                       |
| `libs/ng/README.md:8-9`                       | "(see `docs/plans/ngkit-roadmap.md` H2R)" → an absolute link to `docs/adr/ADR-0004.md` on `main`. Add an absolute link to `docs/guides/http.md` after the pattern list. |
| `libs/ng-bootstrap/crud/README.md`            | The relative link `../../ng/crud/README.md` breaks inside the tarball; make it absolute. Check every other `libs/**/README.md` for relative links the same way.         |

Then run `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`.
Only comments changed, so it must pass unchanged.

### 7.4 `tools/pages/index.html`

Add a fourth card, "Project docs", linking
`https://github.com/rn-forge/ngkit/tree/main/docs`, in the markup style of the
existing cards.

### 7.5 `releases/`

- `index.md`: "Releases, newest first." Then "`0.1.0`–`0.1.2` predate this area; their
  tags and `CHANGELOG.md` are the record." Then the release-1 line.
- `release-1/index.md` (Appendix B.6), status `planned`:
  - **Scope:** E2 and E3 by feature ID (they predate stories; say so); S4.1.1–S4.1.5
    and S4.2.1–S4.2.2.
  - **Entry criteria:** every scope story is done; the owner approves.
  - **Exit criteria:** the tag; the GitHub Release with both tarballs; a
    `CHANGELOG.md` entry that names each breaking change below; `verify-consumer`
    passes on the released tarballs.
  - **Breaking changes to announce**, one bullet each. Check each against the code
    first (e.g. `rg "DATE_RANGE"`):
    1. `@rn-forge/ng/http` and `/http/crud` are removed (`AbstractHTTPService`,
       `BackendService`, `HttpUtil`, `DownloadResponse`, `apiBasePath`); use
       `HttpClient`.
    2. `AuthBackendService` requires `backend.baseUrl` when used.
    3. `FormUtil` validators run on pristine values; `DATE_RANGE(start?, end?)` is a
       group validator; the old `DATE_RANGE(formGroup, …)` form is removed.
    4. `ObjectUtil.diff` compares scalars strictly and arrays and dates structurally.
    5. `CrudDataSource` and its types moved from `@rn-forge/ng-bootstrap/crud` to
       `@rn-forge/ng/crud` and changed shape (AIP-158 lists; `get`, `delete` and
       `Versioned` added; `count`/`next`/`previous`/`results`, `BulkDeleteResponse`,
       `UploadResponse` and `upload` removed).
    6. The `ng-bootstrap/crud` mode `'upload'` is now `'import'`, and `'download'` is
       removed (export is a direct `GET`).
    7. The permission keys `.upload`/`.download` are now `.import`/`.export`.
    8. The CRUD table renders one server page with token paging; there are no
       numbered pages.

---

## 8. Phase 8 — Remove the source plans

Only after the owner's third review:

```sh
git rm docs/plans/ngkit-roadmap.md docs/plans/ngkit-generators-plan.md \
  docs/plans/cims-extraction-plan.md docs/plans/cims-adoption-plan.md
```

`ngkit-agent-guide.md` is already gone: §5.6 moved it with `git mv`. Leave this plan
file for the owner to delete.

---

## 9. Validation

Run from the repository root. Every line must pass. Report the output.

````bash
set -euo pipefail
absent() { local rc=0; rg -q --hidden --glob '!.git' --glob '!node_modules' --glob '!dist' \
  --glob '!coverage' --glob '!docs/plans/**' "$@" || rc=$?; [ "$rc" -eq 1 ]; }
scope=(docs README.md CLAUDE.md AGENTS.md libs apps tools)

# Tree
for a in architecture guides runbooks reference releases specs adr; do
  test -f "docs/$a/index.md"; test -f "docs/$a/_structure.md"; done
test -f docs/_areas.yml; test -f docs/_structure.md; test -f docs/index.md; test -f AGENTS.md
ls docs/adr/ADR-000{1,2,3,4,5,6,7}.md >/dev/null
for n in 1 2 3 4 5 6 7 8 9 10 11 12; do ls -d docs/specs/epics/E$n-*/ >/dev/null; done

# Nothing points at the plans or old plan labels
absent 'docs/plans|ngkit-roadmap|agent-guide\.md|generators-plan|cims-(adoption|extraction)-plan' "${scope[@]}"
absent 'RELEASING\.md|release-and-cicd|README exemption' "${scope[@]}"
absent '\b(H[1-5](\.[0-9])?|H2R(\.[0-9])?)\b' "${scope[@]}" -g '!docs/specs/**'

# Self-contained: no other repositories, surveyed apps or their IDs
absent -i 'pykit|cims|walgreens|ew-loop' "${scope[@]}"
absent -i 'archetype|node-lib' "${scope[@]}"
absent '\bR[0-9]\b|\bB10\b|api-conventions' "${scope[@]}"
absent '/Users/|\.\./\.\./\.\./\.\./|github\.com/rn-forge/(?!ngkit)' --pcre2 "${scope[@]}"
test "$(rg -l -i kiln -g '!docs/plans/**' "${scope[@]}" | sort | tr '\n' ' ')" = \
  "docs/adr/ADR-0007.md docs/specs/_structure.md "

# Content made it across (one distinctive string per source section)
for s in 'propagateTraceHeaderCorsUrls' 'StorageFailureReason' 'importTemplate\[\?prefill=true\]' \
         'createCollectionQuery' 'setup-agentic-coding' 'ColorModeService' 'rnf-\*' \
         'preserveLocalDependencyProtocols' 'excludeTaskDependencies' 'provideRnForgeAuth' \
         'showSkeleton' 'CommandRegistry' 'resolve-dist-workspace-deps' 'Trusted Publish' \
         'Reboot' 'reloadConflict'; do
  rg -q -- "$s" docs || { echo "missing: $s"; exit 1; }; done

# Relative links and anchors under docs/ resolve (GitHub-style heading slugs)
node --input-type=module -e '
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f);
  return statSync(p).isDirectory() ? (f === "plans" ? [] : walk(p)) : p.endsWith(".md") ? [p] : []; });
const slug = h => h.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");
const anchors = f => new Set(readFileSync(f, "utf8").split("\n")
  .filter(l => /^#{1,6} /.test(l)).map(l => slug(l.replace(/^#+ /, ""))));
let bad = 0;
for (const f of [...walk("docs"), "README.md", "CLAUDE.md", "AGENTS.md"]) {
  const text = readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/.test(target)) continue;
    const [path, hash] = target.split("#");
    const file = path ? resolve(dirname(f), path) : resolve(f);
    if (!existsSync(file)) { console.log(`${f}: missing ${target}`); bad++; continue; }
    if (hash && file.endsWith(".md") && !anchors(file).has(hash)) { console.log(`${f}: no anchor ${target}`); bad++; }
    if (/\/_[^/]*\.md$/.test(file) && !f.includes("_structure")) { console.log(`${f}: links a routing file ${target}`); bad++; }
  }
}
process.exit(bad ? 1 : 0);'

# Formatting and code
pnpm exec prettier --check docs CLAUDE.md AGENTS.md
pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo
````

The H-label check excludes `docs/specs/**` because epic indexes carry their former
labels in their `**Source:**` lines. Check by eye that no H-label appears there
anywhere else.

**By hand:** open three random sections of each source plan and find their new home.
List them in the report.

---

## 10. Report back

At the end, report:

1. The validation output.
2. Every place where the code disagreed with a source plan, and what you wrote.
3. Anything you found no home for, and what you did with it.
4. **Owner actions outside this repository.** These are not ngkit docs content, so
   they live only in the report:
   - Ask the server library's maintainers to list `Content-Disposition` in their CORS
     exposed headers, or to document export as same-origin only.
   - Pass on the note that locally issued login, token-exchange and SAML views make a
     backend package an identity provider; if one is needed, adopt one (Keycloak,
     `django-oauth-toolkit`) instead.

---

## Appendix A — `_structure.md` texts

Create each file exactly as below.

### A.1 `docs/_structure.md`

```markdown
# docs/ — what belongs here

The rules for the tree as a whole: which area a statement belongs in, and where new
material goes. `docs/index.md` is the reader's entry point; this file is the
agent's. They are not copies of each other.

## Areas

Declared in `_areas.yml`, in reading order.

| Area            | Holds                                                            |
| --------------- | ---------------------------------------------------------------- |
| `architecture/` | How the libraries and the repository are put together now.       |
| `guides/`       | How to build an app on ngkit, and how to develop ngkit.          |
| `runbooks/`     | Procedures with decision points, such as releasing.              |
| `reference/`    | Pointers to the generated API reference and component catalog.   |
| `releases/`     | What each release carries, by story ID.                          |
| `specs/`        | Work: epics, features, stories, their design and open questions. |
| `adr/`          | Choices between real alternatives.                               |

Every area's rules live in its own `_structure.md`; this file only lists them.
Routing files (`_*.md`, `_areas.yml`) are for maintainers and agents; pages don't
link to them.

## Where new material goes

- Behavior as it is now → `architecture/`, or `guides/` if it is about using or
  developing ngkit. Never duplicated into a spec.
- How to use one entry point → that entry point's `README.md` under `libs/`. It ships
  in the package, so its links are absolute. The generated API reference comes from
  doc comments.
- A choice between real alternatives → a new ADR under `adr/`; a change to one → that
  ADR, revised in place.
- Work to do, or a record of work done → an epic under `specs/epics/`.
- What ships when → `releases/`.
- A procedure with judgement calls → `runbooks/`.
- An open question → the epic or feature it blocks, until it becomes an ADR or a
  rejected option recorded there.
- History, evidence, what a review changed → the commit message.

## Self-contained

These docs describe only this repository. A requirement that came from another
repository or from a surveyed application is written here in full, as ngkit's own,
without naming its source. Pages don't link to or cite paths in other repositories.
`specs/_structure.md` says how a dependency on another repository is written.

## Checks

Nothing enforces this tree automatically yet. `pnpm exec prettier --check docs`
checks formatting. When moving a page, check the links to it by hand.

## Keeping it honest

Check for these when changing the tree, and report what you find rather than fixing
it silently; some of it is deliberate:

- A release names a story ID that does not exist, or a planned story is in no
  release.
- An epic's status contradicts its stories, or its board row is in the wrong group,
  or in two.
- Two ADRs decide the same topic, or an ADR's Decision changed
  (`git log --follow docs/adr/ADR-<nnnn>.md`) with no Background entry saying so.
- Design prose collecting in a top-level page instead of under its feature.
- A `progress.md`, `backlog.md`, `decisions.md` or `overview.md` has appeared; each
  restates what the epics, deferred epics, ADRs or README already own.
- `README.md`, `CLAUDE.md` or `AGENTS.md` describing the tree instead of linking to
  it. `CLAUDE.md` links to the specs board and the ADR log and says what each is for;
  `AGENTS.md` points at `CLAUDE.md`.
```

### A.2 `docs/adr/_structure.md`

```markdown
# adr/ — what belongs here

## Belongs here

A durable choice that constrains future implementations. Each ADR answers one
question: what was chosen, why, and what tradeoff follows.

A feature of the libraries is not a decision. If the page describes what ngkit does,
it belongs in `architecture/` or `specs/`; if it describes a constraint every future
implementation must respect, it belongs here.

## Does not belong here

| Instead of                                      | Put it in                                     |
| ----------------------------------------------- | --------------------------------------------- |
| Scope, supported combinations, rollout work     | `specs/`                                      |
| Implementation details and local design choices | the owning feature's Design                   |
| Exact signatures and options                    | the entry point's `README.md` or doc comments |
| How implemented components fit together         | `architecture/`                               |
| Review transcripts and obsolete drafts          | version history                               |

## Naming and shape

- `ADR-<nnnn>.md`, listed in `index.md`. The title states the decision, not the
  topic.
- The first line:
  `**Status:** <proposed|accepted|deprecated> (<date>) · **Scope:** <what the decision binds>`.
- Then these sections, in order:
  1. `## Decision`: the choice, with only the context needed to state it.
  2. `## Consequences`: what follows, including the costs accepted.
  3. `## Influences`: links to the specs and architecture this decision constrains.
  4. `## Alternatives considered`: credible options, each with the failure that
     ruled it out.
  5. `## Background`: optional; the history that still explains the choice.
- Keep the first three sections to 300 words or fewer; they are read on every open.
  The last two are as long as the evidence needs, with 600 words a soft total.
- Name concrete costs, not summaries of them.

## Changing this area

New decisions take the next number. Rewrite a revised decision to state the current
choice, and add what changed under `Background` as a dated sentence. Don't append
earlier versions. An answered open question becomes a decision here only when it has
a durable consequence; otherwise record it on the feature.
```

### A.3 `docs/architecture/_structure.md`

```markdown
# architecture/ — what belongs here

## Belongs here

- How the libraries and the repository are put together now: entry points,
  boundaries, and the mechanisms that hold them.
- The reasoning that survived a decision, once the decision itself is an ADR.

## Does not belong here

| Instead of                         | Put it in                |
| ---------------------------------- | ------------------------ |
| A choice between real alternatives | an ADR under `adr/`      |
| How to do something                | `guides/` or `runbooks/` |
| Work not done yet                  | an epic under `specs/`   |

## Naming and shape

One kebab-case `.md` per subject; `index.md` links them in reading order.
```

### A.4 `docs/guides/_structure.md`

```markdown
# guides/ — what belongs here

## Belongs here

- How to build an application on ngkit, written for the person or agent doing it.
- How to develop ngkit itself: commands, checks, and adding entry points or libraries.

## Does not belong here

| Instead of                        | Put it in                      |
| --------------------------------- | ------------------------------ |
| How ngkit is built                | `architecture/`                |
| A procedure with a decision in it | `runbooks/`                    |
| One entry point's API             | that entry point's `README.md` |

## Naming and shape

One kebab-case `.md` per activity; `index.md` links them in reading order.
```

### A.5 `docs/runbooks/_structure.md`

```markdown
# runbooks/ — what belongs here

## Belongs here

A procedure someone follows under pressure, or one where a step needs a judgement
call that must not be automated.

## Does not belong here

| Instead of                     | Put it in |
| ------------------------------ | --------- |
| A routine development activity | `guides/` |
| A one-off plan                 | `specs/`  |

## Naming and shape

One kebab-case `.md` per procedure, written as ordered steps with the decision
points called out.
```

### A.6 `docs/reference/_structure.md`

```markdown
# reference/ — what belongs here

## Belongs here

`index.md`, which links to the generated API reference and component catalog on the
published site, and to each entry point's `README.md`.

## Does not belong here

| Instead of                    | Put it in                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Hand-written API descriptions | the entry point's `README.md`, or its doc comments, which the API reference renders |
| How the site is built         | `architecture/release-pipeline.md`                                                  |
```

### A.7 `docs/releases/_structure.md`

```markdown
# releases/ — what belongs here

## Belongs here

- One page per release, `release-<n>/index.md`: its `**Status:**` (`planned`,
  `in progress`, or `shipped` with the date and version), entry criteria, scope,
  breaking changes to announce, and exit criteria.
- Scope named by story ID, linking to the feature file that holds the story. An epic
  that predates the story taxonomy is named by feature ID instead, and the page says
  so.

## Does not belong here

| Instead of                           | Put it in                  |
| ------------------------------------ | -------------------------- |
| A story's text, acceptance or design | its feature under `specs/` |
| A story's status                     | the story itself           |
| Why a choice was made                | an ADR under `adr/`        |

## Changing this area

1. Cut a release page when there is scope to put on it, not ahead of time.
2. Give it its status, entry criteria, scope as story IDs, breaking changes and exit
   criteria. Nothing else: the detail lives with the story.
3. List it in `index.md`, newest first.

A story belongs to exactly one release at a time, and that assignment lives only on
the release page. When a release ships, set `shipped` with the date and version once
its exit criteria hold.
```

### A.8 `docs/specs/_structure.md`

````markdown
# specs/ — what belongs here

## Belongs here

- Every piece of ngkit work as an epic, `epics/E<n>-<slug>/index.md`, done work
  included.
- A feature of an unfinished epic as `F<n>.<m>-<slug>.md` beside it, holding its
  stories inline as `S<n>.<m>.<k>` headings, each with its own `**Status:**` and
  `**Acceptance:**`.
- A done epic that predates this taxonomy keeps its features as rows in its index,
  each with the commit that delivered it.
- Design for unbuilt work, in the feature's `## Design`, or `design.md` in the epic
  when it spans features.
- Open questions, in `## Open questions` on the epic or feature they block.
- Work that is real but not scheduled, as a `deferred` epic with entry criteria. Its
  items are rows until promoted; their design can sit under `## Design`.

## Does not belong here

| Instead of                          | Put it in                     |
| ----------------------------------- | ----------------------------- |
| Behavior that already exists        | `architecture/`               |
| A decision                          | an ADR under `adr/`           |
| Which stories ship in which release | `releases/`, which links here |
| History and evidence                | the commit message            |

## Naming and status

- IDs are permanent. Never renumber; a moved story keeps its ID; gaps are fine.
  Retired work is removed and its ID is never reused.
- Epic and feature status is one of: `elaborating` (agreed; stories, design or
  release not settled), `planned` (stories written and assigned to a release),
  `in progress` (at least one story started), `done` (every story's acceptance
  holds; carries `**Implemented:**` with the date and commits), `deferred` (not
  scheduled; carries `**Entry criteria:**`).
- Story status is `planned`, `in progress` or `done (<date>)`. A story in a deferred
  epic is `deferred`.
- `done` means implemented. It does not mean released; the release pages record
  that.
- `**Owner:**` is `ngkit`.
- `**Source:**`, when present, names the owner decision and its date, or the former
  roadmap item the epic came from.

## Writing acceptance

- A story's `**Acceptance:**` lists observable results, including the tests that
  prove it.
- Every result is checkable inside this repository. Acceptance that needs a host,
  such as a consumer app or a backend, builds it here, as `ng:verify-consumer` does
  for consumer apps.
- A decision the work needs is its own story, so other work can depend on the
  decision alone.
- A feature with several stories may have a `## Acceptance` block that tags each line
  with the story it proves. Where a line can be scripted, the block is a shell script
  that starts with `set -euo pipefail` and never turns a failure into output. A
  negative check uses `absent`, not a bare `! cmd`:

  ```bash
  absent() { local rc=0; rg -q --hidden --glob '!.git' "$@" || rc=$?; [ "$rc" -eq 1 ]; }
  ```

## Other repositories

rn-forge repositories depend on each other the way the shared rn-forge standard, kept
in kiln, describes: a requirement one repository has of another is stated in the
depending repository's own terms and met through a released version or pinned ref.

- A dependency on another repository's software is a version or git pin in the
  manifest of the code that uses it, plus at most an entry criterion that can be
  observed from outside that repository ("a release that exposes
  `Content-Disposition` to cross-origin callers").
- Another repository's pages, paths, spec IDs and internal status are not cited or
  restated. A finding that came from elsewhere is written here in full.
- No page here is written for another repository to cite.

## Changing this area

**Adding work:** take the next free ID; create the epic with its status; put design
at the lowest level that fits; add the epic's row to the board in `index.md`, in
exactly one group.

**Closing work:** a story is done when its acceptance holds. When every story is
done, set the feature and then the epic to `done` with `**Implemented:**`, and move
the board row. An answered open question becomes an ADR, or a rejected option under
`## Considered and rejected`; then remove the question.

**Deferred work:** don't start or elaborate a deferred epic unless the owner asks.
When its entry criteria hold, it becomes `elaborating`, then `planned`. Nothing
renumbers.
````

---

## Appendix B — Page shapes

### B.1 An area `index.md`

```markdown
# Architecture

How ngkit's libraries and repository are put together today. Read in this order:

- [Workspace](workspace.md): projects, entry points and the dependency direction.
- …
```

### B.2 `docs/index.md`

```markdown
# ngkit

<the README's first paragraph>

## Read in this order

1. **[Specs](specs/index.md)**: the board. What is done, what is next, and which
   release it belongs to. Start here in a new session.
2. **[Decisions](adr/index.md)**: the ADR log, each decision with the alternatives
   that were rejected.
3. **[Workspace](architecture/workspace.md)**: the projects, entry points and how
   they depend on each other.
4. **[Building an app](guides/building-an-app.md)** and
   **[Developing ngkit](guides/development.md)**.
5. **[Releasing](runbooks/releasing.md)**.

## What each area is for

| Area                                  | Holds                                                           |
| ------------------------------------- | --------------------------------------------------------------- |
| [Architecture](architecture/index.md) | how the libraries work today                                    |
| [Guides](guides/index.md)             | building an app on ngkit; developing ngkit                      |
| [Runbooks](runbooks/index.md)         | procedures with decision points                                 |
| [Reference](reference/index.md)       | the generated API reference and component catalog               |
| [Releases](releases/index.md)         | what ships when, by story ID                                    |
| [Specs](specs/index.md)               | work: epics, features, stories, their design and open questions |
| [Decisions](adr/index.md)             | choices between real alternatives                               |
```

### B.3 An ADR

```markdown
# ADR-0004: ngkit ships no HTTP client; applications use Angular's `HttpClient`

**Status:** accepted (2026-09-23) · **Scope:** every ngkit entry point, existing and future

## Decision

## Consequences

## Influences

## Alternatives considered

## Background
```

### B.4 ADR-0007, as written (fill in the date)

```markdown
# ADR-0007: ngkit's docs follow the shared rn-forge docs standard

**Status:** accepted (<date>) · **Scope:** everything under `docs/`, the READMEs, `CLAUDE.md` and `AGENTS.md`

## Decision

ngkit's `docs/` uses the areas, naming and status model of the shared rn-forge docs
standard, kept in kiln: `architecture/`, `guides/`, `runbooks/`, `reference/`,
`releases/`, `specs/` and `adr/`, routed by `_structure.md` files and declared in
`docs/_areas.yml`. The docs are plain Markdown read on GitHub; there is no docs site
build. The generated API reference (Compodoc) and component catalog (Storybook) stay
on GitHub Pages, and `reference/` points at them. How to use an entry point stays in
that entry point's `README.md`, which ships in the package.

The docs are self-contained: they describe only this repository, and every
requirement is written here in ngkit's own terms.

## Consequences

A reader who knows another rn-forge repository finds their way around this one.
Work, decisions, current behavior and procedures each have one home, so a status or
a decision is stated once. Nothing checks links automatically; moving a page means
checking its links by hand.

## Influences

The routing rules in `docs/_structure.md` and each area's `_structure.md`, and the
[spec board](../specs/index.md).

## Alternatives considered

- **A MkDocs site.** It would check links on every build, but it adds a Python
  toolchain to a pnpm workspace for a tree small enough to read on GitHub.
- **Keeping `docs/plans/`.** The plans mixed done work, open decisions, deviations and
  test evidence in files of up to 1,145 lines; finding the next step meant reading all
  of them, and statuses drifted from the code.

## Background

Adopted <date>, replacing `docs/plans/`. The former plans' content moved into these
areas in one change; git history holds the originals.
```

### B.5 Epic and feature files

Done epic (predates stories):

```markdown
# E3 — Core correctness

**Status:** done · **Implemented:** 2026-09-23 (`1f54842`) · **Owner:** ngkit

**Source:** former roadmap item H3.

<one paragraph: what it delivered, with links to architecture and ADRs>

[Back to the board](../../index.md)

| ID   | Delivered | Implemented |
| ---- | --------- | ----------- |
| F3.1 | …         | `1f54842`   |

## Considered and rejected

- …

Verified with: `pnpm nx run-many -t lint test build --projects=…`, …
```

In-progress, elaborating or planned epic `index.md`:

```markdown
# E4 — Standard resource screen

**Status:** in progress · **Owner:** ngkit

**Source:** former roadmap item H4.

<summary paragraph>

[Back to the board](../../index.md)

| Feature                              | Status | Scope |
| ------------------------------------ | ------ | ----- |
| [F4.1 — …](F4.1-crud-entry-point.md) | done   | …     |

## Open questions
```

Feature file:

```markdown
# F4.3 — Accept the screen against a real backend

**Status:** elaborating · **Owner:** ngkit · **Epic:** [E4](index.md)

**Depends on:** …

<one paragraph: what and why>

## Stories

### S4.3.1 — Choose the fixture's stack

**Status:** planned

**Acceptance:** …

## Design

## Open questions
```

Deferred epic: the in-progress shape, with `**Status:** deferred` and an
`**Entry criteria:**` line under it, no feature table (E12 has its rows table), and
the source content under `## Design` and `## Open questions`.

### B.6 A release page

```markdown
# Release 1

**Status:** planned

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

## Scope

## Breaking changes to announce

## Exit criteria
```

### B.7 `docs/specs/index.md`

```markdown
# ngkit work

What ngkit is made of and what is left to do. The board says what is next; the epic
says how; its ADRs say why. `done` means implemented; the
[release pages](../releases/index.md) record what shipped.

## Board

### In progress

| Epic | Release | Next step |
| ---- | ------- | --------- |

### To elaborate

| Epic | Next step |
| ---- | --------- |

### Deferred

| Epic | Entry criteria |
| ---- | -------------- |

### Done

| Epic | Implemented |
| ---- | ----------- |

## Conventions

- **Taxonomy.** Epic `E<n>` → feature `F<n>.<m>` → story `S<n>.<m>.<k>`. IDs are
  permanent.
- **Status.** `elaborating`, `planned`, `in progress`, `done` or `deferred` (with
  entry criteria). Stories carry their own status.
- **A decision is its own story**, so work can depend on the decision without
  depending on its implementation.
- **Open questions live on the feature or epic they block.**
- **Acceptance is checked inside ngkit.**
- **Don't start or elaborate a deferred epic unless the owner asks.**
```

### B.8 `AGENTS.md`

```markdown
# AGENTS.md

This repository keeps a single set of agent instructions, in [CLAUDE.md](CLAUDE.md).

**Read `CLAUDE.md` now and follow it as if its contents appeared here.** It maps the
repo and states the conventions and invariants you must respect when changing code.

Do not add guidance to this file. It would drift out of sync, and one of the two
copies would then be wrong with nothing to detect it. Put it in `CLAUDE.md`.
```
