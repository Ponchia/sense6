import { readFile } from 'node:fs/promises';

const path =
  process.argv.find((argument) => argument.endsWith('.json')) ??
  'validation/acutezza/observations.template.json';
const requireEvidence = process.argv.includes('--require-evidence');
let document;
try {
  document = JSON.parse(await readFile(path, 'utf8'));
} catch (error) {
  console.error(`Could not read a valid Acutezza evidence file at ${path}: ${error.message}`);
  process.exit(1);
}
const errors = validate(document, { requireEvidence });

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const summary = analyze(document.sessions);
  console.log(
    JSON.stringify(
      {
        valid: true,
        evidenceGate: requireEvidence ? 'satisfied' : 'not-required',
        devices: document.devices.length,
        sessions: document.sessions.length,
        ...summary,
        clinicalReview: document.clinicalReview.status,
      },
      null,
      2,
    ),
  );
}

function validate(value, { requireEvidence }) {
  const errors = [];
  if (!isRecord(value)) return ['root must be an object'];
  if (value.format !== 'sense6-acutezza-validation') errors.push('format must be sense6-acutezza-validation');
  if (value.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (value.protocolVersion !== '1.0') errors.push('protocolVersion must be 1.0');
  if (!Array.isArray(value.devices)) errors.push('devices must be an array');
  if (!Array.isArray(value.sessions)) errors.push('sessions must be an array');
  if (!Array.isArray(value.exceptions)) errors.push('exceptions must be an array');
  if (!isRecord(value.clinicalReview)) errors.push('clinicalReview must be an object');
  if (errors.length) return errors;

  const deviceIds = new Set();
  for (const [index, device] of value.devices.entries()) {
    const prefix = `devices[${index}]`;
    if (!isRecord(device)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!/^[a-z0-9-]{1,40}$/.test(device.id ?? '')) errors.push(`${prefix}.id is invalid`);
    if (deviceIds.has(device.id)) errors.push(`${prefix}.id is duplicated`);
    deviceIds.add(device.id);
    if (!['phone', 'tablet', 'standard-monitor', 'hidpi-monitor'].includes(device.class))
      errors.push(`${prefix}.class is invalid`);
    if (!['chromium', 'firefox', 'webkit'].includes(device.browser))
      errors.push(`${prefix}.browser is invalid`);
    for (const field of ['browserVersion', 'os', 'display']) {
      if (typeof device[field] !== 'string' || !device[field]) errors.push(`${prefix}.${field} is required`);
    }
  }

  const sessionKeys = new Set();
  for (const [index, session] of value.sessions.entries()) {
    const prefix = `sessions[${index}]`;
    if (!isRecord(session)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!/^[A-Z0-9-]{1,24}$/.test(session.participantCode ?? ''))
      errors.push(`${prefix}.participantCode must be pseudonymous and contain only A-Z, 0-9, and hyphens`);
    if (!deviceIds.has(session.deviceId)) errors.push(`${prefix}.deviceId does not reference a device`);
    if (!['right', 'left'].includes(session.eye)) errors.push(`${prefix}.eye is invalid`);
    if (!Number.isInteger(session.sequence) || session.sequence < 1 || session.sequence > 8)
      errors.push(`${prefix}.sequence is invalid`);
    if (!['none', 'glasses', 'contacts'].includes(session.correction))
      errors.push(`${prefix}.correction is invalid`);
    if (!(session.distanceMm > 0)) errors.push(`${prefix}.distanceMm must be positive`);
    if (!['measured', 'assumed'].includes(session.calibrationMethod))
      errors.push(`${prefix}.calibrationMethod is invalid`);
    if (!isSense6Result(session.sense6)) errors.push(`${prefix}.sense6 is invalid`);
    if (!isFractResult(session.fract)) errors.push(`${prefix}.fract is invalid`);
    if (!Number.isFinite(Date.parse(session.completedAt))) errors.push(`${prefix}.completedAt is invalid`);
    const sessionKey = `${session.participantCode}:${session.deviceId}:${session.eye}:${session.sequence}`;
    if (sessionKeys.has(sessionKey)) errors.push(`${prefix} duplicates a participant/device/eye/sequence`);
    sessionKeys.add(sessionKey);
  }

  for (const [index, exception] of value.exceptions.entries()) {
    const prefix = `exceptions[${index}]`;
    if (!isRecord(exception)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!/^[A-Z0-9-]{1,24}$/.test(exception.participantCode ?? ''))
      errors.push(`${prefix}.participantCode is invalid`);
    if (!deviceIds.has(exception.deviceId)) errors.push(`${prefix}.deviceId does not reference a device`);
    if (!['acutezza', 'fract', 'between-methods', 'retest'].includes(exception.stage))
      errors.push(`${prefix}.stage is invalid`);
    if (
      ![
        'calibration-failure',
        'task-control-failure',
        'missing-result',
        'withdrawal',
        'adverse-event',
      ].includes(exception.outcome)
    )
      errors.push(`${prefix}.outcome is invalid`);
    if (typeof exception.reason !== 'string' || !exception.reason || exception.reason.length > 500)
      errors.push(`${prefix}.reason is required and must be at most 500 characters`);
    if (!Number.isFinite(Date.parse(exception.occurredAt))) errors.push(`${prefix}.occurredAt is invalid`);
  }

  const review = value.clinicalReview;
  if (!['pending', 'changes-requested', 'accepted-nonclinical-boundary'].includes(review.status))
    errors.push('clinicalReview.status is invalid');
  if (!Array.isArray(review.findings) || !review.findings.every((finding) => typeof finding === 'string'))
    errors.push('clinicalReview.findings must be an array of strings');
  if (
    review.reviewerRole !== null &&
    (typeof review.reviewerRole !== 'string' || !review.reviewerRole || review.reviewerRole.length > 80)
  )
    errors.push('clinicalReview.reviewerRole must be null or a role of at most 80 characters');
  if (review.reviewedAt !== null && !Number.isFinite(Date.parse(review.reviewedAt)))
    errors.push('clinicalReview.reviewedAt must be null or a valid date-time');
  if (
    review.status === 'accepted-nonclinical-boundary' &&
    (!review.reviewerRole || !Number.isFinite(Date.parse(review.reviewedAt)))
  )
    errors.push('an accepted clinical review needs a reviewer role and review date');

  if (requireEvidence) {
    for (const deviceClass of ['phone', 'tablet', 'standard-monitor', 'hidpi-monitor']) {
      if (!value.devices.some((device) => device.class === deviceClass))
        errors.push(`evidence gate needs a ${deviceClass}`);
    }
    for (const browser of ['chromium', 'firefox', 'webkit']) {
      if (!value.devices.some((device) => device.browser === browser))
        errors.push(`evidence gate needs a ${browser} device run`);
    }
    if (!value.sessions.length) errors.push('evidence gate needs paired Sense6 and FrACT sessions');
    if (value.sessions.some((session) => session.fract?.trials < 18))
      errors.push('evidence gate requires at least 18 FrACT trials per paired observation');
    if (!hasRetestPairs(value.sessions))
      errors.push('evidence gate needs at least two sequences for every participant/device/eye group');
    if (review.status !== 'accepted-nonclinical-boundary')
      errors.push(
        'evidence gate needs optometrist or ophthalmologist acceptance of the nonclinical boundary',
      );
  }
  return errors;
}

function analyze(sessions) {
  if (!sessions.length) return { comparison: null, testRetest: null };
  const differences = sessions.map(
    (session) => Math.log10(session.sense6.thresholdArcmin) - session.fract.logMar,
  );
  const bias = mean(differences);
  const deviation = sampleDeviation(differences);
  const retestDifferences = retestPairs(sessions).map(
    ([first, second]) => Math.log10(second.sense6.thresholdArcmin) - Math.log10(first.sense6.thresholdArcmin),
  );
  const retestBias = retestDifferences.length ? mean(retestDifferences) : null;
  const retestDeviation = retestDifferences.length ? sampleDeviation(retestDifferences) : null;
  return {
    comparison: {
      observations: differences.length,
      meanBiasLogMar: round(bias),
      lowerLimitLogMar: round(bias - 1.96 * deviation),
      upperLimitLogMar: round(bias + 1.96 * deviation),
    },
    testRetest:
      retestBias === null
        ? null
        : {
            pairs: retestDifferences.length,
            meanDifferenceLogMar: round(retestBias),
            lowerLimitLogMar: round(retestBias - 1.96 * retestDeviation),
            upperLimitLogMar: round(retestBias + 1.96 * retestDeviation),
          },
  };
}

function isSense6Result(result) {
  return (
    isRecord(result) &&
    result.thresholdArcmin > 0 &&
    result.lowerArcmin > 0 &&
    result.upperArcmin >= result.lowerArcmin &&
    result.thresholdArcmin >= result.lowerArcmin &&
    result.thresholdArcmin <= result.upperArcmin &&
    typeof result.bounded === 'boolean' &&
    Number.isInteger(result.controlCorrect) &&
    Number.isInteger(result.controlTotal) &&
    result.controlCorrect >= 0 &&
    result.controlTotal >= result.controlCorrect
  );
}

function isFractResult(result) {
  return (
    isRecord(result) &&
    typeof result.version === 'string' &&
    result.version.length > 0 &&
    Number.isInteger(result.trials) &&
    result.trials > 0 &&
    Number.isFinite(result.logMar)
  );
}

function hasRetestPairs(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    const key = `${session.participantCode}:${session.deviceId}:${session.eye}`;
    const sequences = groups.get(key) ?? new Set();
    sequences.add(session.sequence);
    groups.set(key, sequences);
  }
  return groups.size > 0 && [...groups.values()].every((sequences) => sequences.size >= 2);
}

function retestPairs(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    const key = `${session.participantCode}:${session.deviceId}:${session.eye}`;
    const group = groups.get(key) ?? [];
    group.push(session);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((group) => {
    const ordered = [...group].sort((left, right) => left.sequence - right.sequence);
    return ordered.length >= 2 ? [[ordered[0], ordered[1]]] : [];
  });
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleDeviation(values) {
  if (values.length < 2) return 0;
  const center = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1));
}

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
