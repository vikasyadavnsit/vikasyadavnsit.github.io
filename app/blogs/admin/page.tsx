"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye as EyeIcon, EyeOff } from "lucide-react";
import AuthGate from "@/components/blog/AuthGate";
import { subscribeToPosts, deletePost, updatePost } from "@/lib/blog/firebase-blog";
import type { BlogPost } from "@/lib/blog/types";

function AdminPostList() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);

  useEffect(() => subscribeToPosts(setPosts), []);

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    await deletePost(post.id);
  };

  const togglePublish = async (post: BlogPost) => {
    await updatePost(post.id, { published: !post.published }, post.published);
  };

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-[hsl(var(--blog-fg))]">Manage Posts</h1>
        <Link
          href="/blogs/admin/editor"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(var(--blog-accent))] text-white font-medium"
        >
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      {posts === null && <p className="text-[hsl(var(--blog-muted))]">Loading...</p>}
      {posts !== null && posts.length === 0 && (
        <p className="text-[hsl(var(--blog-muted))]">No posts yet. Create your first one.</p>
      )}

      <div className="flex flex-col gap-3">
        {(posts ?? []).map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[hsl(var(--blog-fg))] truncate">{post.title}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    post.published
                      ? "bg-green-500/10 text-green-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--blog-muted))] mt-1">
                {post.viewCount ?? 0} views &middot; updated {new Date(post.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => togglePublish(post)}
                title={post.published ? "Unpublish" : "Publish"}
                className="p-2 rounded-lg text-[hsl(var(--blog-muted))] hover:bg-[hsl(var(--blog-border))]"
              >
                {post.published ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
              <Link
                href={`/blogs/admin/editor?id=${post.id}`}
                title="Edit"
                className="p-2 rounded-lg text-[hsl(var(--blog-muted))] hover:bg-[hsl(var(--blog-border))]"
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleDelete(post)}
                title="Delete"
                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminPostList />
    </AuthGate>
  );
}
