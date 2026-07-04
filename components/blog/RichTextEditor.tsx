"use client";
import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Strikethrough, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link as LinkIcon, ImageIcon,
  Paperclip, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
} from "lucide-react";
import { fileToBase64 } from "@/lib/blog/file-utils";
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
      className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
        active
          ? "bg-[hsl(var(--blog-accent))] text-white"
          : "text-[hsl(var(--blog-fg))] hover:bg-[hsl(var(--blog-border))]"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ content, onChange, onAttachmentAdded }: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mode } = useBlogTheme();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
          minWidth: 50,
          minHeight: 50,
          alwaysPreserveAspectRatio: true,
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing your post..." }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none ${mode === "dark" ? "prose-invert" : ""} focus:outline-none min-h-[300px] px-4 py-3 text-[hsl(var(--blog-fg))]`,
      },
    },
  });

  if (!editor) return null;

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      editor.chain().focus().setImage({ src: base64, alt: file.name }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to add image.");
    }
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

  return (
    <div className="rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b border-[hsl(var(--blog-border))]">
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
        <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
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
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={() => imageInputRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Edit alt text" disabled={!editor.isActive("image")} onClick={editAltText}>
          <Type className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Attach file" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-4 h-4" />
        </ToolbarButton>
        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
        <input ref={fileInputRef} type="file" hidden onChange={handleFilePick} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
