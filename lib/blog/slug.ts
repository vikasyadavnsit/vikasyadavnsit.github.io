export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "post";
}

export function makeUniqueSlug(title: string, pushId: string): string {
  return `${slugify(title)}-${pushId.slice(-6).toLowerCase()}`;
}
