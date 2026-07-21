const url = process.argv[2];
const timeoutMs = Number(process.argv[3] ?? 30_000);
if (!url) throw new Error('Usage: node scripts/wait-for-url.mjs <url> [timeout-ms]');

const deadline = Date.now() + timeoutMs;
let lastError;
while (Date.now() < deadline) {
  try {
    const response = await fetch(url);
    if (response.ok) process.exit(0);
    lastError = new Error(`HTTP ${response.status}`);
  } catch (error) {
    lastError = error;
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? 'no response'}`);
