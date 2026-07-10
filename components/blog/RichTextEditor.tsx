"use client";
import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Youtube } from "@tiptap/extension-youtube";
import {
  Bold, Italic, Strikethrough, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link as LinkIcon, ImageIcon,
  Paperclip, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, Captions, Table as TableIcon, Youtube as YoutubeIcon, Maximize, Loader2,
} from "lucide-react";
import { fileToBase64 } from "@/lib/blog/file-utils";
import { compressImageToLimit } from "@/lib/blog/image-compress";
import { FigureImage, type ImageAlign } from "@/lib/blog/tiptap-figure-image";
import { useBlogTheme } from "./BlogThemeContext";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onAttachmentAdded: (attachment: { id: string; name: string; url: string; type: string; size: number }) => void;
}

function ToolbarButton({
  onClick, active, disabled, label, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`p-2 rounded-md transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 ${
        active
          ? "bg-[hsl(var(--blog-accent))] text-white shadow-sm shadow-[hsl(var(--blog-accent)/0.4)]"
          : "text-[hsl(var(--blog-fg))] hover:bg-[hsl(var(--blog-border))]"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[hsl(var(--blog-bg)/0.6)]">{children}</div>;
}

export default function RichTextEditor({ content, onChange, onAttachmentAdded }: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [processing, setProcessing] = useState(false);
  const { mode } = useBlogTheme();

  // Compress an image file and insert it at the current selection.
  const insertImageFile = async (file: File) => {
    const ed = editorRef.current;
    if (!ed || !file.type.startsWith("image/")) return;
    setProcessing(true);
    try {
      const base64 = await compressImageToLimit(file);
      ed.chain().focus().setImage({ src: base64, alt: file.name }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to add image.");
    } finally {
      setProcessing(false);
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true },
      }),
      FigureImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing your post..." }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ controls: true, nocookie: true, width: 640, height: 360 }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none ${mode === "dark" ? "prose-invert" : ""} focus:outline-none min-h-[300px] px-4 py-3 text-[hsl(var(--blog-fg))]`,
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((it) => it.type.startsWith("image/"));
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            insertImageFile(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));
        if (imageFile) {
          event.preventDefault();
          insertImageFile(imageFile);
          return true;
        }
        return false;
      },
    },
  });

  editorRef.current = editor;
  if (!editor) return null;

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await insertImageFile(file);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      const attachment = { id: `${Date.now()}-${file.name}`, name: file.name, url: base64, type: file.type, size: file.size };
      onAttachmentAdded(attachment);
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${attachment.url}" download="${attachment.name}" class="blog-attachment-chip">${attachment.name}</a>`
        )
        .run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to add attachment.");
    }
  };

  const setLink = () => {
    const url = window.prompt("Link URL");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const editAltText = () => {
    const current = editor.getAttributes("image").alt ?? "";
    const alt = window.prompt("Alt text (for accessibility & SEO)", current);
    if (alt === null) return;
    editor.chain().focus().updateAttributes("image", { alt }).run();
  };

  const editCaption = () => {
    const current = editor.getAttributes("image").caption ?? "";
    const caption = window.prompt("Image caption", current);
    if (caption === null) return;
    editor.chain().focus().updateAttributes("image", { caption }).run();
  };

  const setImageAlign = (align: ImageAlign) => {
    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  const insertEmbed = () => {
    const url = window.prompt("YouTube or Vimeo video URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  };

  const imageSelected = editor.isActive("image");
  const words = editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0;
  const chars = editor.getText().length;

  return (
    <div className="rounded-[var(--blog-radius-md)] blog-glass-card overflow-hidden">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 p-2 border-b border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))]/95 backdrop-blur">
        <ToolbarGroup>
          {/* Text style */}
          <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <Underline className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarGroup>
          {/* Headings */}
          <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarGroup>
          {/* Alignment */}
          <ToolbarButton label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
            <AlignJustify className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarGroup>
          {/* Lists & blocks */}
          <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarGroup>
          {/* Insert */}
          <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Insert image" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Embed video" onClick={insertEmbed}>
            <YoutubeIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Attach file" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarGroup>
          {/* History */}
          <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarGroup>
        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
        <input ref={fileInputRef} type="file" hidden onChange={handleFilePick} />
      </div>

      {/* Contextual image controls — only when an image is selected */}
      {imageSelected && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-b border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-bg))]">
          <span className="text-xs uppercase tracking-widest text-[hsl(var(--blog-muted))] px-2">Image</span>
          <ToolbarGroup>
            <ToolbarButton label="Edit alt text" onClick={editAltText}><Type className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton label="Edit caption" onClick={editCaption}><Captions className="w-4 h-4" /></ToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup>
            <ToolbarButton label="Align image left" active={editor.getAttributes("image").align === "left"} onClick={() => setImageAlign("left")}><AlignLeft className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton label="Align image center" active={editor.getAttributes("image").align === "center"} onClick={() => setImageAlign("center")}><AlignCenter className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton label="Align image right" active={editor.getAttributes("image").align === "right"} onClick={() => setImageAlign("right")}><AlignRight className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton label="Full width" active={editor.getAttributes("image").align === "full"} onClick={() => setImageAlign("full")}><Maximize className="w-4 h-4" /></ToolbarButton>
          </ToolbarGroup>
        </div>
      )}

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-[hsl(var(--blog-border))] text-xs text-[hsl(var(--blog-muted))]">
        <span>{words} words · {chars} characters</span>
        {processing && (
          <span className="flex items-center gap-1.5 text-[hsl(var(--blog-accent))]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing image…
          </span>
        )}
      </div>
    </div>
  );
}
