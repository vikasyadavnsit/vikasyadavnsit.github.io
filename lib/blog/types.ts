export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string | null;
  tags: string[];
  attachments: Record<string, Attachment>;
  author: string;
  published: boolean;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  viewCount: number;
}

export type BlogPostDraft = Omit<
  BlogPost,
  "id" | "createdAt" | "updatedAt" | "viewCount" | "publishedAt"
>;
