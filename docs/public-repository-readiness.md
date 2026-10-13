# Public repository readiness

Lifecycle: current

This guide separates repository preparation from the decision to make Sense6
public. It complements [product readiness](product-readiness.md): source
publication does not establish usability, translation quality, or scientific
validity. The maintainer chooses when to change visibility.

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
| `.editorconfig`, `.github/actionlint.yaml`, `.lycheeignore`, `.zap-rules.tsv` | Keep: editor or audit configuration consumed by the corresponding tools. Audit the automatic config files as well as workflow flags. |
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
contains local backup paths and account-maintenance context that should be
reviewed for removal before public exposure. Its content is not project
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
The hosted jobs must pass before the infrastructure cutover can proceed.

The current workflows use a self-hosted `arc-vps-sense6` runner. `ci.yml`
currently accepts only same-repository pull requests, and policy tests verify
that checked-in graph. A fork can propose a modified workflow, so neither the
condition nor those tests establish an infrastructure security boundary.
GitHub explicitly warns against exposing self-hosted runners to public
pull-request code; approval settings alone are not isolation.

Before publication, provide a GitHub-hosted or otherwise isolated path for
untrusted contributions and remove their ability to target the internal
runner. The simplest deployment model is to move public-repository jobs to
GitHub-hosted runners and revoke this repository's internal-runner access. A
retained private release service needs a separately reviewed trust boundary.
Verify enforcement with a fork that changes the workflow and an npm lifecycle
script, not only a normal fork that leaves the guard intact. Do not run that
probe against an accessible privileged runner.

Keep deployment credentials restricted to trusted release work, review
workflow approval and token settings, and verify exact required status checks.
Record the resulting external policy and review evidence before changing
visibility. This cleanup does not change runner infrastructure or authorize
publication.

References: [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use#hardening-for-self-hosted-runners)
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
