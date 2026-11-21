/**
 * A canonical production page must answer directly. Following a redirect can
 * hide a bad canonical rule; retrying it delays detection of an edge loop.
 * @param {URL} url
 */
export async function fetchCanonicalPage(url) {
  let response;
  try {
    response = await fetch(url, { redirect: 'error', cache: 'no-store' });
  } catch (cause) {
    throw new Error(`Canonical page must return HTTP 200 without a redirect: ${url}`, { cause });
  }
  if (response.status !== 200) {
    throw new Error(`Canonical page expected HTTP 200: ${url} returned ${response.status}`);
  }
  return response;
}
