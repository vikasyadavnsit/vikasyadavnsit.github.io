import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "em", "s", "u", "a",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "img", "figure", "figcaption", "hr", "br", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "iframe",
];

const ALLOWED_ATTR = [
  "href", "target", "rel",
  "src", "alt", "title", "width", "height",
  "class", "download", "style",
  "data-align", "data-caption",
  "colspan", "rowspan",
  "allow", "allowfullscreen", "frameborder",
];

// Images/attachments are embedded as base64 data URIs (no Firebase Storage on the free tier),
// so DOMPurify's default protocol allowlist must be extended to permit `data:`.
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

// Only these hosts may appear in an <iframe src> (video embeds). Everything else is dropped.
const EMBED_HOST_ALLOWLIST = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
];

let hookInstalled = false;

function installIframeGuard() {
  if (hookInstalled || typeof window === "undefined") return;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") return;
    const el = node as Element;
    const src = el.getAttribute("src") || "";
    let ok = false;
    try {
      const host = new URL(src, window.location.href).hostname;
      ok = EMBED_HOST_ALLOWLIST.includes(host);
    } catch {
      ok = false;
    }
    if (!ok) el.parentNode?.removeChild(el);
  });
  hookInstalled = true;
}

export function sanitizeBlogHtml(html: string): string {
  if (typeof window === "undefined") return html;
  installIframeGuard();
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP });
}
