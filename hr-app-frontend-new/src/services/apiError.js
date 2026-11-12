// The message to show for a failed API response. ASP.NET returns errors as JSON
// ({ message } or ProblemDetails' { title }), as plain text from BadRequest("..."), or
// with no body at all; none of these may surface as a JSON parsing error.
export const readErrorMessage = async (response, fallback) => {
  let text = '';
  try {
    text = await response.text();
  } catch {
    return fallback;
  }
  if (!text) return fallback;

  try {
    const body = JSON.parse(text);
    if (typeof body === 'string' && body.trim()) return body;
    return body?.message || body?.title || fallback;
  } catch {
    // Not JSON. Short plain text is the API's own message; anything else (an HTML
    // error page from a proxy) is not worth showing.
    const trimmed = text.trim();
    return trimmed && trimmed.length <= 300 && !trimmed.startsWith('<') ? trimmed : fallback;
  }
};
