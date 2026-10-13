# Security policy

## Reporting a vulnerability

Please keep exploit details, credentials, and private journal exports out of
public issues and pull requests.

Use **[Report a vulnerability](https://github.com/Ponchia/sense6/security/advisories/new)**
to send a private report. GitHub private vulnerability reporting is enabled.
If that channel is unavailable, contact Zeno Trevisan through the contact links
on [brontolotto.observer](https://brontolotto.observer/) to arrange a private route.
An initial contact only needs to identify Sense6 and request that route.
Do not put vulnerability details in a public issue.

Include the affected commit or deployed URL, browser and operating system,
reproduction steps using synthetic data, expected and observed behavior, and
the potential impact. A minimal reproduction is more useful than a complete
browser profile, storage dump, or exported personal journal.

## Scope and supported code

Security fixes target the current `main` branch and the current deployment at
[sense6.net](https://sense6.net/). There is no separate long-term-support or
backport policy for older snapshots.

Relevant reports include unintended disclosure of local answers or journal
entries, script injection, unsafe import handling, unauthorized use of the
metrics endpoint, and compromised dependency or build boundaries. An
inaccurate instruction or result interpretation also deserves attention;
report ordinary product defects through the contribution process using
non-personal examples.

Sense6 is an experimental perception project. It does not provide medical,
diagnostic, screening, or clinically validated results. The maintainer makes
no guaranteed response-time or bounty commitment.

## Data and repository boundaries

- Answers, measurements, and optional journal history stay on the device.
  Deliberate copy/export actions put that data under the user's control.
- The server accepts only allowlisted daily aggregate event counts. See
  [ADR 0002](docs/adr/0002-store-only-anonymous-daily-product-metrics.md).
- Keep local `.env` and `.dev.vars` files, tokens, browser profiles, participant
  notes, private exports, and unredacted scan reports out of Git and CI artifacts.
  Ignore rules prevent accidental staging; they cannot undo an earlier commit.
- A discovered credential must be revoked or rotated before evaluating any
  history repair. Removing a file from the current tree does not remove its
  earlier versions from Git history.

The repository is public and its internal ARC runner registration was removed
at launch. See [public-repository readiness](docs/public-repository-readiness.md)
for the controls and bounded audit scope. The hosted-runner source checks do not
replace the external registration boundary. Never reattach the shared internal
runner as a public-repository recovery path.
