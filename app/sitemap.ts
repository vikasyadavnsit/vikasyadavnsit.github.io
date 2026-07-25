import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://vikasyadavnsit.github.io";

const routes = [
  "",
  "/blogs",
  "/projects",
  "/projects/ai",
  "/projects/iot",
  "/projects/iot/bridge",
  "/projects/creative-stuff",
  "/projects/creative-stuff/algorithm-arena",
  "/projects/creative-stuff/chat-application",
  "/projects/creative-stuff/file-encryptor",
  "/projects/creative-stuff/file-transfer",
  "/projects/creative-stuff/flagbase",
  "/projects/creative-stuff/internet-speed-test",
  "/projects/creative-stuff/notable-notes",
  "/projects/creative-stuff/password-vault",
  "/projects/creative-stuff/qr-login",
  "/projects/creative-stuff/request-lab",
  "/projects/creative-stuff/scratchpad",
  "/projects/creative-stuff/task-manager",
  "/projects/creative-stuff/totp-authenticator",
  "/projects/creative-stuff/url-shortener",
  "/projects/creative-stuff/whiteboard",
  "/projects/creative-stuff/workflow-builder",
  "/projects/fun-stuff",
  "/projects/fun-stuff/baby-monitor",
  "/projects/fun-stuff/earth-3d",
  "/projects/fun-stuff/eternal-journey",
  "/projects/fun-stuff/family-tree",
  "/projects/fun-stuff/fruit-ninja",
  "/projects/fun-stuff/open-meet",
  "/projects/fun-stuff/talking-characters",
  "/projects/fun-stuff/webcam-pan-zoom",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
