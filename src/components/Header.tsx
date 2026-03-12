"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <p className="site-eyebrow">Seattle · Ballard · Beyond</p>
      <h1 className="site-title">Seattle Shows</h1>
      <div className="site-ornament">✦ ✦ ✦</div>
      <nav className="site-nav">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          Upcoming
        </Link>
        <Link href="/venues" className={pathname.startsWith("/venues") ? "active" : ""}>
          Venues
        </Link>
      </nav>
    </header>
  );
}
