"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import AuthGate from "@/components/blog/AuthGate";
import RichTextEditor from "@/components/blog/RichTextEditor";
import AttachmentList from "@/components/blog/AttachmentList";
import {
  createPost, updatePost, getPostBySlugOrId, newPostId,
} from "@/lib/blog/firebase-blog";
import { sanitizeBlogHtml } from "@/lib/blog/sanitize";
import { makeUniqueSlug } from "@/lib/blog/slug";
import { fileToBase64 } from "@/lib/blog/file-utils";
import type { Attachment, BlogPost } from "@/lib/blog/types";

function EditorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [postId, setPostId] = useState<string | null>(null);
  const [existing, setExisting] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);

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

  const handleCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setCoverImageUrl(base64);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to add cover image.");
    }
  };

  const handleAttachmentAdded = (attachment: Attachment) => {
    setAttachments((prev) => ({ ...prev, [attachment.id]: attachment }));
  };

  const save = async (published: boolean) => {
    if (!postId || !title.trim()) return;
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

      <div className="flex flex-col gap-5 max-w-3xl">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold bg-transparent outline-none border-b border-[hsl(var(--blog-border))] pb-2 text-[hsl(var(--blog-fg))] placeholder:text-[hsl(var(--blog-muted))]"
        />

        <textarea
          placeholder="Short excerpt / summary shown on the dashboard"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          className="px-4 py-3 rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] outline-none text-[hsl(var(--blog-fg))] placeholder:text-[hsl(var(--blog-muted))] resize-none"
        />

        <input
          type="text"
          placeholder="Tags, comma separated"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="px-4 py-3 rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] outline-none text-[hsl(var(--blog-fg))] placeholder:text-[hsl(var(--blog-muted))]"
        />

        <div>
          {coverImageUrl ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImageUrl} alt="Cover" className="h-40 rounded-xl object-cover" />
              <button
                onClick={() => setCoverImageUrl(null)}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[hsl(var(--blog-border))] text-[hsl(var(--blog-muted))]"
            >
              <ImagePlus className="w-4 h-4" /> Add cover image
            </button>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverPick} />
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

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => save(false)}
            disabled={saving || !title.trim()}
            className="px-5 py-2.5 rounded-xl border border-[hsl(var(--blog-border))] text-[hsl(var(--blog-fg))] font-medium disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving || !title.trim()}
            className="px-5 py-2.5 rounded-xl bg-[hsl(var(--blog-accent))] text-white font-medium disabled:opacity-50"
          >
            Publish
          </button>
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
