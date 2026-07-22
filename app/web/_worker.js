/**
 * Cloudflare Pages edge worker — rich link previews for invitations.
 *
 * WHY THIS EXISTS
 * The web build is a single-page app: every route is served the same
 * index.html, and link crawlers (WhatsApp, Gmail, Slack…) do not execute
 * JavaScript. So a shared /invite/<token> link can only ever preview the
 * generic site metadata — unless something rewrites the HTML per URL before
 * it is served. That "something" is this worker.
 *
 * WHAT IT DOES
 * Everything is passed straight through to the static assets. The one
 * exception: a crawler asking for /invite/<token> gets index.html with its
 * Open Graph tags replaced by the trip's real name, dates and cover photo,
 * fetched from the public /share/invitations/<token> API endpoint.
 *
 * Humans never pay the extra round-trip (we gate on User-Agent), and any
 * failure — bad token, API down, timeout — silently falls back to the
 * untouched HTML. This must never break the page.
 *
 * DEPLOY: copied into dist/ by .github/workflows/frontend.yml before
 * `wrangler pages deploy`. Cloudflare does not build anything, so if that
 * copy step is removed this file simply stops existing in production.
 */

// Kept in one place; `env.API_URL` (a Pages runtime variable) wins if set,
// which is how a future PRE environment would point at its own API.
const DEFAULT_API_URL = "https://tripinci-api.fly.dev";

const INVITE_PATH = /^\/invite\/([^/?#]+)\/?$/;

// Preview bots. Anything not matching is treated as a human and served the
// plain static asset.
const CRAWLER_UA =
  /facebookexternalhit|facebookcatalog|WhatsApp|Twitterbot|Slackbot|Slack-ImgProxy|TelegramBot|Discordbot|LinkedInBot|Googlebot|bingbot|Applebot|SkypeUriPreview|redditbot|Pinterest|embedly|Iframely|vkShare|SocialMedia|Snapchat/i;

const META_TIMEOUT_MS = 2000;

/** Sets the `content` attribute of a <meta> tag. */
class ContentSetter {
  constructor(value) {
    this.value = value;
  }
  element(el) {
    el.setAttribute("content", this.value);
  }
}

/** Replaces the text inside <title>. */
class TitleSetter {
  constructor(value) {
    this.value = value;
  }
  element(el) {
    el.setInnerContent(this.value);
  }
}

async function fetchMeta(apiUrl, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${apiUrl}/share/invitations/${encodeURIComponent(token)}`,
      { signal: controller.signal, headers: { accept: "application/json" } },
    );
    if (!res.ok) return null; // 404 = expired/revoked/unknown → no preview
    return await res.json();
  } catch {
    return null; // network error or timeout
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(INVITE_PATH);
    const userAgent = request.headers.get("user-agent") || "";

    if (!match || !CRAWLER_UA.test(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    // The SPA shell is what every route renders; fetch it explicitly so we
    // get HTML even though /invite/<token> is not a real file.
    const shell = await env.ASSETS.fetch(new Request(new URL("/", url), request));

    const meta = await fetchMeta(env.API_URL || DEFAULT_API_URL, match[1]);
    if (!meta) return shell;

    const rewriter = new HTMLRewriter()
      .on("title", new TitleSetter(meta.title))
      .on('meta[name="description"]', new ContentSetter(meta.description))
      .on('meta[property="og:title"]', new ContentSetter(meta.title))
      .on('meta[name="twitter:title"]', new ContentSetter(meta.title))
      .on('meta[property="og:description"]', new ContentSetter(meta.description))
      .on('meta[name="twitter:description"]', new ContentSetter(meta.description))
      .on('meta[property="og:url"]', new ContentSetter(url.toString()));

    if (meta.image_url) {
      rewriter
        .on('meta[property="og:image"]', new ContentSetter(meta.image_url))
        .on('meta[name="twitter:image"]', new ContentSetter(meta.image_url));
    }

    // Re-wrap so the headers are mutable (those coming straight off a
    // transformed asset response are not).
    const transformed = rewriter.transform(shell);
    const response = new Response(transformed.body, transformed);
    // Let crawlers cache briefly, but not so long that a revoked invite
    // keeps previewing.
    response.headers.set("cache-control", "public, max-age=300");
    return response;
  },
};
