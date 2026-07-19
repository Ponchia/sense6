<!-- vale Vale.Spelling = NO -->
# 0004. Store a local structured measurement journal

Status: accepted

## Context

Sense6 previously retained one concise latest or best result per experiment.
That supported a returning-user hint but could not compare repeated runs. A
history feature could create pressure for accounts or uploaded health-adjacent
measurements, conflict with the project's privacy boundary, or imply that
different instruments belong in one score.

Translated prose is not a durable interchange format. Comparisons also need the
display, input, correction, distance, audio, and quality conditions that affect
each instrument. A numeric difference without its uncertainty, measurement
bound, or setup context can be misleading.

## Decision

Store up to 100 structured entries in a separate, versioned local-storage
envelope under `sense6:journal`. Keep the existing latest-or-best stores for
compatibility.

Each journal entry contains:

- an entry ID, instrument ID, recording time, source locale, and quality state;
- a language-neutral setup passport;
- separate named measurements with units, uncertainty intervals, or explicit
  upper and lower bounds; and
- machine-readable caution notes.

Apply instrument-specific setup rules and label paired runs as comparable,
comparable with caution, or not comparable. Show numeric change only for the
same named measurement. Combine available run uncertainty and retain a visible
warning when either value is a bound. Never calculate a suite-wide score.

Export and import a documented, size-limited JSON envelope. Validate every
field, reject future schemas, and merge idempotently by entry ID. Keep the
journal in the browser unless the person deliberately exports it. Provide
individual and complete deletion.

## Consequences

Repeated runs become useful without an account, server database, identifier, or
result upload. An exported file is portable across locales because it contains
structured data rather than rendered prose.

The browser cannot verify every real-world condition. Udito comparisons always
carry a volume caution, and missing or changed setup fields reduce or prevent
comparability. Storage quotas can still prevent a save; the application keeps
the completed result visible when that happens.

The journal format now requires migration discipline. New instruments must add
a setup passport, named measurements, comparison rules, and recording tests.
