import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "h1", "h2", "h3", "h4",
  "strong", "em", "s", "u", "a",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "img", "hr", "br", "span",
];

const ALLOWED_ATTR = [
  "href", "target", "rel",
  "src", "alt", "title", "width", "height",
  "class", "download",
];

// Images/attachments are embedded as base64 data URIs (no Firebase Storage on the free tier),
// so DOMPurify's default protocol allowlist must be extended to permit `data:`.
const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

export function sanitizeBlogHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP });
}
