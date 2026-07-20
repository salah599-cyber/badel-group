import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getInstagramProfileLabel, getInstagramProfileUrl } from "@/lib/instagram";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-primary/20 bg-gradient-to-br from-primary-dark to-[#7a3200] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <Logo size="lg" variant="light" />
            <p className="max-w-xs text-center text-sm text-white/75 sm:text-left">
              Padel tournaments, community events, and championship experiences across the UAE.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:gap-12">
            <div>
              <p className="mb-3 font-semibold text-secondary">Explore</p>
              <ul className="space-y-2 text-white/80">
                <li><Link href="/gallery" className="hover:text-white">Gallery</Link></li>
                <li><Link href="/results" className="hover:text-white">Results</Link></li>
                <li><Link href="/rankings" className="hover:text-white">Rankings</Link></li>
                <li><Link href="/sponsors" className="hover:text-white">Sponsors</Link></li>
                <li><Link href="/signup" className="hover:text-white">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-semibold text-secondary">Contact</p>
              <ul className="space-y-2 text-white/80">
                <li>
                  <a href="mailto:info@badelgroup.com" className="hover:text-white">
                    info@badelgroup.com
                  </a>
                </li>
                <li>
                  <a href={getInstagramProfileUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {getInstagramProfileLabel()}
                  </a>
                </li>
                <li>
                  <Link href="/admin" className="text-white/50 hover:text-white/80">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Badel Group. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
