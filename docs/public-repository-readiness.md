# Public repository maintenance

Lifecycle: current

Sense6 is public. This guide records the launch review and the controls to
preserve while maintaining the repository. It complements
[product readiness](product-readiness.md): publishing source and passing software
checks do not establish human comprehension, translation quality, or scientific
validity.

## Verified public launch

The maintainer authorized public release on 13 October 2026. Repository
preparation and runtime fixes were merged in
[PR #155](https://github.com/Ponchia/sense6/pull/155) and
[PR #157](https://github.com/Ponchia/sense6/pull/157). The hosted-runner migration
was merged in [PR #156](https://github.com/Ponchia/sense6/pull/156), followed by
the maintainer and optional-support links in
[PR #154](https://github.com/Ponchia/sense6/pull/154).

The launch release at `4cdda235614514fc6fd71ea4b9e2370bfcb8c17c` passed all four
jobs in the [production workflow](https://github.com/Ponchia/sense6/actions/runs/38345115508),
including the live commit/asset contract and deployed JavaScript journey.
Deployment and scheduled audits are enabled; the launch bootstrap is complete.
That dated receipt is not evidence that a later revision has passed.

The private runner registration was removed separately before public workflow
execution. Actions was held during the visibility change and protection setup.
The initial hosted attempts on the private repository had been refused before
runner allocation; the controlled public bootstrap did not reinterpret those
failed attempts as passes or enable paid larger runners.

## Controls to preserve

| Boundary | Required contract |
| --- | --- |
| Protected `main` | Up-to-date branch and all four GitHub Actions checks: `verify / browser`, `verify / lighthouse`, `verify / visual`, and `verify / release`. Enforced for administrators; force pushes and deletion disabled. |
| Reviews | Resolve review conversations. No second-maintainer approval requirement is imposed on this single-maintainer project. `CODEOWNERS` routes review; it does not replace the required checks. |
| Contributions | Fork and same-repository pull requests use the unprivileged hosted verifier. External contributors require workflow approval. Default workflow tokens are read-only and cannot approve pull requests. |
| Runners | Every job uses standard `ubuntu-24.04` hosted runners or a local reusable workflow. The repository has no internal runner registration. Never restore the shared private runner as a recovery shortcut. |
| Credentials | Checkout does not persist Git credentials. Pull-request verification receives no production publication credentials. The protected production environment permits only the branch `main`, not tags. |
| Release | Browser, visual, Lighthouse, and artifact gates remain mandatory. Build once, checksum before the artifact audits, verify the same bytes before publication, and check the exact live revision afterward. |
| Security reports | GitHub private vulnerability reporting and secret-scanning push protection are enabled. Keep sensitive reports out of public issues. |
| Branch lifecycle | Delete merged feature branches automatically. Review non-merged branches for genuinely unique work before removing them. Keep `main` protected. |

Source-policy tests check workflow wiring; they cannot attest GitHub settings or
revoke runner registrations. Recheck both the source and the external controls
when changing CI, repository access, or deployment. Current operational release
and rollback instructions are in the
[Cloudflare Pages runbook](runbooks/cloudflare-pages-release.md).

For a read-only control review, use an account with the required repository
administration access:

```sh
gh api repos/Ponchia/sense6/branches/main/protection
gh api repos/Ponchia/sense6/actions/permissions/workflow
gh api repos/Ponchia/sense6/actions/permissions/fork-pr-contributor-approval
gh api repos/Ponchia/sense6/actions/runners
gh api repos/Ponchia/sense6/private-vulnerability-reporting
gh api repos/Ponchia/sense6/environments/production
gh api repos/Ponchia/sense6/environments/production/deployment-branch-policies
```

An inaccessible setting is unknown, not a passing check. Keep raw account
readbacks and recovery records private. Do not repeat the one-time Actions hold
or visibility change as a normal maintenance step.

References: [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use)
and [repository Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).

## Sponsorship and contributor entry points

[`.github/FUNDING.yml`](../.github/FUNDING.yml) declares the maintained Ko-fi
account using GitHub's supported `ko_fi` key. The README and all localized About
pages link to the same optional support destination. Funding does not unlock
experiments, buy a support guarantee, or change the MIT license. Do not add a
GitHub Sponsors entry unless that account is actually enrolled and available.

Check both the file on `main` and the resolved GitHub Sponsor button after a
funding change. A valid-looking file on a feature branch does not establish
what visitors see. The public entry-point tests cover the funding declaration,
package metadata, maintainer routing, and the private reporting link; they do
not contact the funding provider or verify payment processing.

Use the [issue forms](../.github/ISSUE_TEMPLATE/) for ordinary defects and
focused improvements, the [pull-request template](../.github/PULL_REQUEST_TEMPLATE.md)
for verification and contract changes, and [SECURITY.md](../SECURITY.md) for
private vulnerability reports. Keep all public reproductions synthetic.

Reference: [GitHub funding-file documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).

## Branch cleanup

Before bulk cleanup, fetch the current refs and review open pull requests,
merged heads, and branches with no merged PR. A squash merge can leave a branch
outside `main`'s ancestry even though its work is integrated. Conversely, a
branch with a merged PR may have received additional commits afterward.

Preserve a private Git bundle and exact ref-to-commit manifest before deleting
many refs. Verify the bundle, restore it into an isolated mirror, and check its
object integrity. Delete only the reviewed tips with exact-tip guards; reassess
if a PR, branch, or commit changes. Never delete protected `main`, rewrite its
history, or discard an active worktree to make a branch list appear clean.
Local worktrees can retain uncommitted or ignored data even after a remote branch
is gone; preserve and report those separately.

Enable automatic deletion of merged head branches to prevent another backlog.
This does not decide the fate of unmerged proposals or local working files.
See [GitHub branch cleanup](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches).

## What belongs in the repository

| Material | Decision and source of truth |
| --- | --- |
| Source, tests, build scripts, lockfile, migrations | Keep: they define behavior and reproduce checks. Migrations support the optional aggregate metrics service. |
| `src/locales/generated/` | Keep: deliberately tracked catalogs. Regenerate with `npm run locales:generate`; `locales:check` rejects drift. |
| `public/social/` SVG and PNG files | Keep: shipped sharing assets reproduced by `npm run social:images`. |
| Public IndexNow verification file | Keep: intentionally public ownership proof, not a deployment credential. |
| `docs/adr/` and `docs/research/` | Keep: decisions and explicitly archived evidence. Historical research is not current setup instruction or scientific validation. |
| `.editorconfig`, `.lycheeignore`, `.zap-rules.tsv` | Keep: consumed editor and audit configuration. Audit automatically loaded files as well as workflow flags. |
| Retired Codespell/custom-runner configuration and unused DOI exception | Removed in the launch work because their former consumers or cited source no longer existed. |
| `dist/`, dependencies, reports, coverage, local credentials, personal exports | Keep out of Git. Generated outputs are reproducible; personal material is not project source. |

The package's `private: true` prevents accidental npm publication; it is
independent of GitHub visibility and remains appropriate for this application.
Distributed UI and font attribution is described in
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## History and sensitive-data review

The 12 October 2026 review began at `9f344b6` on `origin/main`, with 277 tracked
files totaling about 6.3 MB and no tracked dependency or browser-report trees.
A later mirror at `070a574`, including fetched GitHub pull-request refs, covered
446 commits, 2,047 UTF-8 text blobs, 127 binary blobs, commit messages, and 267
textual archive members. The redacted Gitleaks scans found no matches within
that scope.

The binary inventory contained 126 PNG files and one historical UI package
archive. PNG chunk and checksum inspection found no text or EXIF metadata
chunks. Contact sheets showed product pages and sharing assets. The archive's
six non-text members were Doto fonts. This was not a pixel-by-pixel or complete
optical-character-recognition audit.

The follow-through reviewed 155 GitHub issue/pull-request bodies and 107 issue
comments, with no detector matches. One historical operational comment was
removed during launch preparation; its readback returned HTTP 404 and the
original private audit capture was retained.

These are dated, bounded results, not a guarantee about all historical or future
content. Deleted or unavailable refs, every Actions artifact/log, external
backups, unavailable attachments, and every form of binary content were not
fully audited. Recheck new commits and public metadata as the project changes.
Keep scanner reports, private exports, account snapshots, and author mappings
outside the public repository.

To repeat the source scan after fetching the desired refs:

```sh
git fetch --all --tags --prune
gitleaks git . --log-opts=--all --redact --ignore-gitleaks-allow
npm audit --ignore-scripts
```

Ordinary fetches do not retrieve every pull-request or deleted ref. Record the
actual ref set, scanner version, base revision, and exclusions. The Git scan
alone does not reproduce the additional archive and metadata review above.

### Author identity

New local commits use the maintainer's established GitHub noreply identity.
Published history was preserved at launch; changing the local Git identity or
deleting feature branches does not remove earlier author metadata.

An unpublished rewrite preview from the 446-commit mirror replaced 596 email
occurrences while preserving every source tree. It changed all 446 commit IDs
and affected 147 signed commits. The preview and original mirror are retained
privately; the rewrite was not pushed. Any future history repair requires a
separate maintainer decision and coordination with existing clones and PR refs.
Revoke an exposed credential before evaluating history repair.

Reference: [GitHub sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Ongoing readiness

Use the portable setup in [CONTRIBUTING.md](../CONTRIBUTING.md) from a clean
clone without deployment credentials. Keep the exact-head release graph green,
retain evidence for approved visual changes, and verify the deployed revision.
A merged pull request, a started deployment, and a verified live release are
separate states.

[Product readiness](product-readiness.md) owns human comprehension review,
language editing, and search-index evidence. Keep these open tasks visible;
repository maintenance and automated tests cannot complete them by declaration.
