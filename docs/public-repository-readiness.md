# Public repository readiness

Lifecycle: current

This guide separates repository preparation from the decision to make Sense6
public. It complements [product readiness](product-readiness.md): source
publication does not establish usability, translation quality, or scientific
validity. The maintainer authorized public launch on 13 October 2026. Source visibility
is now public. The launch receipt records actual hosted qualification separately
from source availability and the applied controls.

## Public launch controls

At the 13 October 2026 cutover, internal Sense6 runner registration was removed
through infrastructure PR #194 and both owning Flux Kustomizations reconciled.
The 18 peer runner specifications were unchanged. Actions was held during the
visibility change and protection setup. Main requires all four GitHub Actions
checks, including for administrators; force pushes and deletions are disabled.
External contributors require workflow approval, and the default token is read-only.
Private vulnerability reporting and secret-scanning push protection are enabled.
The production environment allows only the branch `main`, not tags.

Deployment and scheduled audits remain paused until the hosted migration passes
its exact-head CI and merges normally. The published website keeps its previous
verified release during this bootstrap. The launch work record is the source of
truth for completion; public source alone is not a passed deployment.

## Review baseline

The 12 October 2026 review started at `9f344b6` on `origin/main`.
The source repository was private and already licensed under MIT. At that
baseline, the tracked tree contained 277 files totaling about 6.3 MB. No
tracked dependency directories, build output, or browser-run reports needed
bulk removal. See the cleanup pull request for the final diff and verification.

The code retains a small static-site toolchain with route-loaded vanilla
JavaScript. Shared storage, lifecycle, numerical helpers, localization,
contracts, and views already have meaningful boundaries. Large instrument
controllers remain incremental decomposition work; a framework rewrite is
not a publication prerequisite. Current priorities are in the
[roadmap](roadmap.md#controller-and-style-decomposition-backlog).

## What belongs in the repository

| Material | Decision and source of truth |
| --- | --- |
| Source, tests, build scripts, lockfile, migrations | Keep: they define behavior and reproduce checks. The migrations support the optional aggregate metrics service. |
| `src/locales/generated/` | Keep: generated catalogs are deliberately checked in. Regenerate with `npm run locales:generate`; `locales:check` rejects drift. |
| `public/social/` SVG and PNG files | Keep: reproducible sharing assets from `npm run social:images`. They are shipped product assets. |
| `public/4572265e611a4df9903d7bb3fe2c1572.txt` | Keep: the intentionally public IndexNow verification key. It is not a deployment credential. |
| `docs/adr/` | Keep: accepted architectural decisions and their reasons. |
| `docs/research/` | Keep: explicitly archived research and review evidence. It is not current setup instruction. |
| `.editorconfig`, `.lycheeignore`, `.zap-rules.tsv` | Keep: editor or audit configuration consumed by the corresponding tools. Audit the automatic config files as well as workflow flags. |
| `.github/actionlint.yaml` | Removed with the hosted-runner cutover: it only declared the retired custom runner label and a null configuration value. Standard Ubuntu labels need no custom declaration. |
| `.codespellrc` | Removed: it only exempted a word no longer in the maintained source, and no current check invokes Codespell. |
| Retired DOI in `.lycheeignore` | Removed: no current source cites it. The remaining exact publisher exceptions live in one registry and are covered by policy tests. |
| `dist/`, reports, coverage, local credentials, personal exports | Keep out of Git. Build and validation outputs are reproducible; personal material is not project source. |

The package's `private: true` prevents accidental npm publication; it is
independent of GitHub visibility and should remain for this application.
Third-party attribution is described in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## History and sensitive-data review

The first review inspected 405 commits and 2,084 unique blobs reachable in
its checkout. The follow-through on 12 October 2026 expanded that scope to a
fresh mirror, including GitHub pull-request refs, with `main` at `070a574`:
446 commits, 2,047 UTF-8 text blobs, and 127 binary blobs. Gitleaks found no
matches in either the Git-history scan or the fully redacted text scan, which
also covered commit messages and 267 textual archive members.

The binary inventory comprised 126 PNG files and one historical UI package
archive. PNG chunk and checksum inspection found no text or EXIF metadata
chunks. Contact-sheet review showed product pages and sharing assets. The
archive's six non-text members were Doto font files. This bounded image review
was not a complete pixel-by-pixel or optical-character-recognition audit.

The follow-through separately inspected 155 GitHub issue/pull-request bodies
and 107 issue comments. No review bodies or review comments were present.
The redacted detector found no matches. One historical maintainer comment
contained local backup paths and account-maintenance context. It was removed
during launch preparation; a readback returned HTTP 404. The previous private
audit capture is retained. Its content is not project
source, and removing it from a checked-out tree would not change the comment.

These results are bounded evidence, not a guarantee that every surface is free
of private information. They do not cover deleted or unavailable refs, all CI
artifacts, external backups, unavailable attachments, or every form of data
embedded in binary content. The final publication candidate needs a fresh
review of the refs and metadata that will actually become public. Keep raw
metadata, scanner reports, private exports, and author mappings outside Git.

### Author identity

Future repository commits now use the maintainer's established GitHub noreply
identity through repository-local Git configuration. The global Git identity
and existing published history were not changed.

An isolated, unpublished email-rewrite preview was prepared from the expanded
446-commit mirror. It removes 596 occurrences of the professional email from
author and committer fields while preserving every source tree. All 446 commit
IDs change, and 147 existing signed commits are affected. The original mirror
and the comparison map are retained privately; the rewritten preview has no
remote configured.

That preview makes the privacy decision concrete, but it has not been pushed.
Preserve existing history unless the maintainer chooses this specific repair
and its consequences. A display-only author mapping cannot remove the email
from Git objects. Rewriting branch heads also does not by itself purge GitHub
pull-request refs, cached views, or existing clones. If a real credential is
later found, revoke it before planning history repair.

Reference: [GitHub guidance on removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

To repeat the code scan, use Gitleaks with full redaction and scan every
reachable ref in a freshly fetched clone:

```sh
git fetch --all --tags --prune
gitleaks git . --log-opts=--all --redact --ignore-gitleaks-allow
npm audit --ignore-scripts
```

Keep detailed scanner output private. Check the scanner version and document
scope, base revision, exclusions, and result in the review; the Git scan alone
does not reproduce the additional text-blob/archive-member inspection above.

## Prerequisites for changing visibility

### 1. Enforce the runner boundary outside pull-request code

The implementation is staged in two unmerged draft pull requests:
[Sense6 hosted verification](https://github.com/Ponchia/sense6/pull/156) and
[retirement of its internal runner registration](https://github.com/Ponchia/vps-infra/pull/194).
They preserve the required browser, visual, Lighthouse, and release gates.
The first hosted attempt was rejected before job steps ran because GitHub
reported an account payment or spending-limit issue. That annotation does not
establish which billing condition caused it. No billing setting was changed.
The maintainer subsequently authorized the Actions-held public bootstrap below.
It does not mark those failed hosted attempts as passes or enable paid usage.

The hosted draft depends on the [runtime followthrough](https://github.com/Ponchia/sense6/pull/157),
which must merge first.

The workflow source selects standard GitHub-hosted `ubuntu-24.04` VMs for all
verification, release, and scheduled-audit jobs. Fork and same-repository pull
requests enter the same unprivileged verifier. The pinned Playwright container,
browser matrix, Lighthouse budgets, visual comparison and evidence rules,
release dependencies, and artifact checksum checks remain mandatory.

This is only the repository half of the transition. A fork can change a
workflow, add a job, or run an npm lifecycle script. A fixed runner label and
source-policy tests do not revoke its ability to request an internal runner.
Before public launch, remove Sense6's repository-scoped ARC registration from
`Ponchia/vps-infra` and verify that deletion in Flux and GitHub. The current
internal runner uses privileged Docker-in-Docker on a shared VPS; disabling its
service-account token does not isolate that host. The repository belongs to a
personal account, so organization runner-group restrictions are not an
available boundary in the present account structure.

#### Coordinated cutover

The normal path qualifies hosted jobs while private. The account blocked that
path before runner allocation. On 13 October 2026 the maintainer explicitly
authorized public release and standard hosted runners. This controlled bootstrap
preserves the required checks without exposing the internal runner:

1. Review the exact source and run the portable local checks. Runtime content
   remains the already verified production source; test the additional workflow
   policies, contribution forms, and documentation. Keep historical author
   metadata unchanged; the unpublished rewrite preview is not applied.
2. Hold repository Actions disabled and drain queued/running work. Keep the
   existing verified website serving its last release. Disable the deployment
   and scheduled-audit workflows individually until the hosted change is merged.
3. After its normal infrastructure gate passes, merge the scoped runner
   retirement. Verify Flux, the removed HelmRelease, scale set, listener, runner
   pods, service account, and GitHub registration. Verify peer-runner health.
4. Make the reviewed repository public while Actions remains held. Configure
   and read back branch protection, read-only workflow tokens, approval for all
   external contributors, and private vulnerability reporting. Configure the
   production environment to accept only the `main` branch, not tags.
5. Re-enable Actions with deployment and scheduled workflows still disabled.
   Run the exact hosted pull-request candidate. Require all four successful
   checks, including required visual evidence. Do not merge the hosted change
   with failed, skipped, or missing checks. Old self-hosted labels have no
   registration and cannot reach the shared VPS.
6. Merge the qualified hosted candidate normally, with an exact head guard.
   Re-enable the deployment and scheduled workflows and dispatch production
   from `main`. Verify its full graph, unchanged artifact checksum, live build
   metadata, public contract, and deployed JavaScript journey.
7. Qualify an external-contribution path only on hosted runners with no
   publication credentials. In-memory hostile-runner fixtures and live removal
   checks establish different properties; do not call them an actual fork test.

Publication reveals retained Git metadata, issues, pull requests, and Actions
history. The sensitive-data review is bounded as described above. Preserve
private audit material outside Git, remove the reviewed operational comment,
and record any unavailable historical surface rather than declaring a full audit.
Public source availability does not establish human language or physical-device
validation. Do not change billing or substitute paid larger runners.

#### Reviewed launch settings

These commands are a reviewable launch recipe, not a preparation step. The
maintainer must authorize the public launch separately, verify ARC retirement,
and drain active jobs first. Before any write, save the existing readbacks in
private operator evidence. The private repository returned HTTP 403 for branch
protection on the current plan; its `preview` and `production` environments
have no protection rules. Do not claim these settings are already enforced.

Hold Actions while performing the separately authorized visibility change and
applying its public-only controls:

```sh
gh api repos/Ponchia/sense6/actions/permissions
gh api --method PUT repos/Ponchia/sense6/actions/permissions -F enabled=false
```

After the authorized visibility change, protect `main` with the exact four
GitHub Actions check contexts. App ID `15368` was verified from the successful
review candidate; recheck the publisher on the hosted candidate before applying.
Zero required approving reviews preserves the single-maintainer workflow; do
not demand another approver unless one has actually joined the project.

```sh
gh api --method PUT repos/Ponchia/sense6/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "verify / browser", "app_id": 15368},
      {"context": "verify / lighthouse", "app_id": 15368},
      {"context": "verify / visual", "app_id": 15368},
      {"context": "verify / release", "app_id": 15368}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

gh api --method PUT repos/Ponchia/sense6/actions/permissions/workflow \
  -f default_workflow_permissions=read \
  -F can_approve_pull_request_reviews=false
gh api --method PUT repos/Ponchia/sense6/actions/permissions/fork-pr-contributor-approval \
  -f approval_policy=all_external_contributors
gh api --method PUT repos/Ponchia/sense6/private-vulnerability-reporting
```

Read back every setting. Confirm the exact four check names and publisher,
strict checks and admin enforcement, zero required approving reviews, disabled
force pushes/deletions, read-only default token, workflow approval disabled,
`all_external_contributors`, and private reporting `enabled: true`:

```sh
gh api repos/Ponchia/sense6/branches/main/protection --jq '{checks: .required_status_checks.checks, strict: .required_status_checks.strict, enforce_admins: .enforce_admins.enabled, reviews: .required_pull_request_reviews.required_approving_review_count, force_pushes: .allow_force_pushes.enabled, deletions: .allow_deletions.enabled}'
gh api repos/Ponchia/sense6/actions/permissions/workflow
gh api repos/Ponchia/sense6/actions/permissions/fork-pr-contributor-approval
gh api repos/Ponchia/sense6/private-vulnerability-reporting
```

Confirm **Report a vulnerability** is visible and the maintainer receives
security notifications before accepting a real report. Do not submit exploit
content as a setup test. Resolve any missing readback while Actions stays
held. Only then restore Actions and confirm its enabled state:

```sh
gh api --method PUT repos/Ponchia/sense6/actions/permissions -F enabled=true
gh api repos/Ponchia/sense6/actions/permissions
```

The release job selects `production` only for publication and `verification`
otherwise. Restrict the production environment to the branch `main` and verify
that tags are not allowed. No extra human approval is required for this single
maintainer workflow; all four automated release gates remain mandatory.

API contracts: [branch protection](https://docs.github.com/en/rest/branches/branch-protection#update-branch-protection),
[Actions permissions](https://docs.github.com/en/rest/actions/permissions),
and [private reporting](https://docs.github.com/en/rest/repos/repos#enable-private-vulnerability-reporting-for-a-repository).

#### Rollback

Before public launch, a failed hosted candidate leaves the existing private
release path available. If the workflow migration has merged but retirement
has not, revert that migration while still private. If ARC has already been
retired, first restore its exact reviewed infrastructure source and verify the
service account, HelmRelease and listener, then restore the private workflow.
After the repository is public, recover on hosted runners or keep Actions
disabled; do not reattach the shared internal runner as a quick rollback.

References: [standard hosted runner selection](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job),
[Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use#hardening-for-self-hosted-runners),
[runner groups](https://docs.github.com/en/actions/concepts/runners/runner-groups),
and [repository Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#controlling-changes-from-forks-to-workflows-in-public-repositories).

### 2. Verify a private vulnerability-reporting route

Enable and exercise GitHub private vulnerability reporting when available,
or publish a verified private contact route. The API did not expose a reporting
setting during this private-repository review; it returned HTTP 404. GitHub's
private-reporting feature is for public repositories, so this is not evidence
that a reporting route is configured. The contact links in
[SECURITY.md](../SECURITY.md) can be used to request a private channel; they have
not been verified as a working vulnerability intake. Enable reporting and
verify its readback and visible entry point at the visibility cutover, or
exercise a private contact route beforehand.

### 3. Recheck the exact source and release candidate

Run the portable contributor setup from [CONTRIBUTING.md](../CONTRIBUTING.md)
in a fresh clone without deployment credentials or the maintainer's workspace
helpers. Require `npm run check:core`, browser checks appropriate to the diff,
and the existing release graph. Retain visual evidence for approved visible
changes; do not bypass an artifact-upload failure to obtain a green gate.

Re-run the sensitive-data review against the refs that will actually become
public. Review the license and generated third-party notices, issue/PR text,
tracked images, and repository metadata. A safe source tree and green software
tests remain distinct from the final visibility decision.
