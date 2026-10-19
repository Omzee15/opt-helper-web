// The page ships with data-app-live="false", which shows Join Waitlist instead of the download.
// When the APP_LIVE env variable is "true", this flips it so the download buttons show.
export default async (request, context) => {
  const response = await context.next();
  if (Netlify.env.get("APP_LIVE") !== "true" || response.status !== 200) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(html.replace('data-app-live="false"', 'data-app-live="true"'), { status: 200, headers });
};

export const config = { path: ["/", "/index.html"] };
