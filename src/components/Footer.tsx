import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-primary/10 bg-primary-dark text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Badel Group"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
            <div>
              <p className="text-lg font-bold tracking-wide uppercase">Badel Group</p>
              <p className="text-sm text-white/70">Padel tournaments & community</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 sm:items-end">
            <div className="flex gap-4 text-sm">
              <a href="mailto:info@badelgroup.com" className="hover:text-secondary">
                info@badelgroup.com
              </a>
              <a href="https://instagram.com" className="hover:text-secondary" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </div>
            <Link href="/admin" className="text-xs text-white/50 hover:text-white/80">
              Admin
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Badel Group. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
