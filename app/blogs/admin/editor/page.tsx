"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, X, Loader2 } from "lucide-react";
import AuthGate from "@/components/blog/AuthGate";
import RichTextEditor from "@/components/blog/RichTextEditor";
import AttachmentList from "@/components/blog/AttachmentList";
import {
  createPost, updatePost, getPostBySlugOrId, newPostId,
} from "@/lib/blog/firebase-blog";
import { sanitizeBlogHtml } from "@/lib/blog/sanitize";
import { makeUniqueSlug } from "@/lib/blog/slug";
import { compressImageToLimit } from "@/lib/blog/image-compress";
import type { Attachment, BlogPost } from "@/lib/blog/types";

const fieldClass =
  "w-full rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] px-4 py-3 outline-none text-[hsl(var(--blog-fg))] placeholder:text-[hsl(var(--blog-muted))] focus:border-[hsl(var(--blog-accent))] focus:ring-2 focus:ring-[hsl(var(--blog-accent)/0.15)] transition-colors";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-[hsl(var(--blog-muted))] mb-1.5 block";

function EditorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [postId, setPostId] = useState<string | null>(null);
  const [existing, setExisting] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [showTitleError, setShowTitleError] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [attachments, setAttachments] = useState<Record<string, Attachment>>({});

  useEffect(() => {
    if (editId) {
      getPostBySlugOrId(editId).then((post) => {
        if (post) {
          setExisting(post);
          setPostId(post.id);
          setTitle(post.title);
          setExcerpt(post.excerpt);
          setTagsInput(post.tags.join(", "));
          setCoverImageUrl(post.coverImageUrl);
          setContentHtml(post.contentHtml);
          setAttachments(post.attachments ?? {});
        }
        setLoading(false);
      });
    } else {
      setPostId(newPostId());
    }
  }, [editId]);

  const handleCoverFile = async (file: File) => {
    try {
      const base64 = await compressImageToLimit(file);
      setCoverImageUrl(base64);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to add cover image.");
    }
  };

  const handleCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await handleCoverFile(file);
  };

  const handleCoverDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) await handleCoverFile(file);
  };

  const handleAttachmentAdded = (attachment: Attachment) => {
    setAttachments((prev) => ({ ...prev, [attachment.id]: attachment }));
  };

  const save = async (published: boolean) => {
    if (!postId || !title.trim()) {
      setShowTitleError(true);
      return;
    }
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const sanitized = sanitizeBlogHtml(contentHtml);

      if (existing) {
        await updatePost(
          postId,
          { title, excerpt, tags, coverImageUrl, contentHtml: sanitized, attachments, published },
          existing.published
        );
      } else {
        await createPost({
          title,
          slug: makeUniqueSlug(title, postId),
          excerpt,
          contentHtml: sanitized,
          coverImageUrl,
          tags,
          attachments,
          author: "Vikas Yadav",
          published,
        });
      }
      router.push("/blogs/admin");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !postId) {
    return <p className="text-[hsl(var(--blog-muted))] pt-12">Loading...</p>;
  }

  return (
    <div className="pt-6 pb-16">
      <h1 className="text-2xl font-bold text-[hsl(var(--blog-fg))] mb-8">
        {existing ? "Edit Post" : "New Post"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="blog-glass-card rounded-[var(--blog-radius-lg)] p-6 md:p-8 flex flex-col gap-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))]">
            Content
          </h2>

          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              placeholder="e.g. Building a Realtime Blog with Firebase"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setShowTitleError(false);
              }}
              className={`text-2xl font-bold ${fieldClass}`}
            />
            {showTitleError && !title.trim() && (
              <p className="text-xs text-[hsl(var(--blog-danger))] mt-1.5">Title is required</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Excerpt</label>
            <textarea
              placeholder="Short summary shown on the dashboard"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </div>

          <RichTextEditor
            content={contentHtml}
            onChange={setContentHtml}
            onAttachmentAdded={handleAttachmentAdded}
          />

          {Object.keys(attachments).length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))] mb-2">
                Attachments
              </h3>
              <AttachmentList attachments={attachments} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="blog-glass-card rounded-[var(--blog-radius-md)] p-6 flex flex-col gap-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))]">
              Metadata
            </h2>

            <div>
              <label className={labelClass}>Tags</label>
              <input
                type="text"
                placeholder="Comma separated"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Cover image</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleCoverDrop}
                className={`rounded-[var(--blog-radius-md)] border-2 border-dashed p-3 transition-colors ${
                  dragOver ? "border-[hsl(var(--blog-accent))] bg-[hsl(var(--blog-accent)/0.05)]" : "border-[hsl(var(--blog-border))]"
                }`}
              >
                {coverImageUrl ? (
                  <div className="relative rounded-[var(--blog-radius-sm)] overflow-hidden aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setCoverImageUrl(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-[hsl(var(--blog-danger))] text-white hover:brightness-110 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-8 text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-accent))] transition-colors"
                  >
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-sm text-center">Drag &amp; drop or click to add a cover image</span>
                  </button>
                )}
                <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverPick} />
              </div>
            </div>
          </div>

          <div className="blog-glass-card rounded-[var(--blog-radius-md)] p-6 flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))]">
              Publish
            </h2>
            {existing && (
              <p className="text-xs text-[hsl(var(--blog-muted))]">
                Last updated {new Date(existing.updatedAt).toLocaleString()}
              </p>
            )}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--blog-radius-sm)] bg-[hsl(var(--blog-accent))] text-white font-medium disabled:opacity-50 hover:brightness-110 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Publish
              </button>
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[var(--blog-radius-sm)] border border-[hsl(var(--blog-border))] text-[hsl(var(--blog-fg))] font-medium disabled:opacity-50 hover:bg-[hsl(var(--blog-border))] transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <AuthGate>
      <Suspense fallback={<p className="text-[hsl(var(--blog-muted))] pt-12">Loading...</p>}>
        <EditorForm />
      </Suspense>
    </AuthGate>
  );
}
