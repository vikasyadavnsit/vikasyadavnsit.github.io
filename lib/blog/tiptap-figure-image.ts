import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/react";

export type ImageAlign = "left" | "center" | "right" | "full";

const ALIGN_CLASS: Record<ImageAlign, string> = {
  left: "blog-img-align-left",
  center: "blog-img-align-center",
  right: "blog-img-align-right",
  full: "blog-img-align-full",
};

/**
 * Image node extended with `align` + `caption`. The alignment/caption live as
 * `data-*` attributes on the <img> itself so they round-trip through parseHTML even
 * though renderHTML wraps the image in a <figure>/<figcaption> when a caption exists.
 */
export const FigureImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => (attrs.align ? { "data-align": attrs.align } : {}),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") || "",
        renderHTML: (attrs) => (attrs.caption ? { "data-caption": attrs.caption } : {}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = (HTMLAttributes["data-align"] as ImageAlign) || "center";
    const caption = (HTMLAttributes["data-caption"] as string) || "";
    const alignClass = ALIGN_CLASS[align] ?? ALIGN_CLASS.center;

    const imgAttrs = mergeAttributes(HTMLAttributes, {
      class: `blog-img ${alignClass}`,
    });

    if (caption) {
      return [
        "figure",
        { class: `blog-figure ${alignClass}` },
        ["img", imgAttrs],
        ["figcaption", { class: "blog-figcaption" }, caption],
      ];
    }
    return ["img", imgAttrs];
  },
}).configure({
  allowBase64: true,
  resize: {
    enabled: true,
    directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
    minWidth: 50,
    minHeight: 50,
    alwaysPreserveAspectRatio: true,
  },
});
