export function drawLandoltRing(
  canvas,
  {
    diameterCssPx,
    orientationDegrees,
    target = 'rgb(18 18 18)',
    background = 'rgb(244 244 242)',
    boxCssPx = 320,
    devicePixelRatio = window.devicePixelRatio || 1,
    supersample = 3,
  },
) {
  const renderScale = Math.max(1, devicePixelRatio) * supersample;
  const backing = Math.max(1, Math.round(boxCssPx * renderScale));
  canvas.width = backing;
  canvas.height = backing;
  canvas.style.inlineSize = `${boxCssPx}px`;
  canvas.style.blockSize = `${boxCssPx}px`;
  const context = canvas.getContext('2d', { alpha: false });
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, backing, backing);

  const diameter = diameterCssPx * renderScale;
  const radius = diameter / 2;
  const unit = diameter / 5;
  const center = backing / 2;
  context.save();
  context.translate(center, center);
  context.fillStyle = target;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = background;
  context.beginPath();
  context.arc(0, 0, radius - unit, 0, Math.PI * 2);
  context.fill();
  context.rotate(((orientationDegrees - 90) * Math.PI) / 180);
  context.fillRect(-unit / 2, -unit / 2, radius + unit, unit);
  context.restore();
  return { backing, diameter, unit };
}

export function drawMeridianField(
  canvas,
  {
    angleDegrees,
    scale = 1,
    phase = 0,
    target = 'rgb(25 25 25)',
    background = 'rgb(244 244 242)',
    boxCssPx = 190,
    devicePixelRatio = window.devicePixelRatio || 1,
    supersample = 3,
  },
) {
  const renderScale = Math.max(1, devicePixelRatio) * supersample;
  const backing = Math.max(1, Math.round(boxCssPx * renderScale));
  canvas.width = backing;
  canvas.height = backing;
  canvas.style.inlineSize = `${boxCssPx}px`;
  canvas.style.blockSize = `${boxCssPx}px`;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = background;
  context.fillRect(0, 0, backing, backing);
  context.save();
  context.beginPath();
  context.arc(backing / 2, backing / 2, backing * 0.42, 0, Math.PI * 2);
  context.clip();
  context.translate(backing / 2, backing / 2);
  context.rotate((angleDegrees * Math.PI) / 180);
  context.translate((phase - 0.5) * renderScale, 0);
  context.strokeStyle = target;
  context.lineWidth = Math.max(renderScale * 0.7 * scale, 1);
  const spacing = renderScale * 7 * scale;
  for (let y = -backing; y <= backing; y += spacing) {
    context.beginPath();
    context.moveTo(-backing, y);
    context.lineTo(backing, y);
    context.stroke();
  }
  context.restore();
  context.strokeStyle = target;
  context.lineWidth = Math.max(1, renderScale * 0.35);
  context.beginPath();
  context.arc(backing / 2, backing / 2, backing * 0.42, 0, Math.PI * 2);
  context.stroke();
  return { backing, spacing };
}
