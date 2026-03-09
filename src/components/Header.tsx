import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Seattle Shows
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Upcoming
          </Link>
          <Link href="/venues" className="text-gray-600 hover:text-gray-900">
            Venues
          </Link>
        </nav>
      </div>
    </header>
  );
}
