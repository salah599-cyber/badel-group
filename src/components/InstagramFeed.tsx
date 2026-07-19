import Image from "next/image";
import { SectionHeading } from "@/components/SectionHeading";
import {
  fetchInstagramPosts,
  getInstagramProfileLabel,
  getInstagramProfileUrl,
} from "@/lib/instagram";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function truncateCaption(caption: string | null, maxLength = 80): string | null {
  if (!caption) return null;
  const trimmed = caption.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export async function InstagramFeed() {
  const posts = await fetchInstagramPosts(6);
  const profileUrl = getInstagramProfileUrl();
  const profileLabel = getInstagramProfileLabel();

  return (
    <section className="section-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          title="Instagram"
          subtitle="Latest photos and highlights from our tournaments and community"
          className="mb-0"
        />
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white sm:self-auto"
        >
          <InstagramIcon className="h-4 w-4" />
          Follow {profileLabel}
        </a>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5"
            >
              <Image
                src={post.imageUrl}
                alt={truncateCaption(post.caption) ?? "Instagram post"}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
              {post.mediaType === "VIDEO" && (
                <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold tracking-wide text-white uppercase">
                  Video
                </span>
              )}
              {post.caption && (
                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-xs font-medium text-white sm:translate-y-full sm:transition sm:duration-300 sm:group-hover:translate-y-0">
                  {truncateCaption(post.caption)}
                </p>
              )}
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-primary/20 bg-cream/50 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-md">
            <InstagramIcon className="h-7 w-7" />
          </div>
          <p className="mb-2 text-lg font-semibold text-gray-900">
            Follow us on Instagram
          </p>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-600">
            Tournament highlights, behind-the-scenes moments, and community updates
            are posted on our Instagram page.
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            <InstagramIcon className="h-4 w-4" />
            Follow {profileLabel}
          </a>
        </div>
      )}
    </section>
  );
}
