import Link from "next/link";
import Image from "next/image";
// @ts-ignore
const ProfileBubbleChip = require("@/components/profile-bubble-chip").ProfileBubbleChip;
import { useAuth } from "@/hooks/use-auth";

export default function AppHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-lg bg-slate-900/80">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image src="/logo.png" alt="Loop Logo" width={120} height={40} priority style={{ cursor: "pointer" }} />
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/scenarios" className="text-slate-300 hover:text-white font-semibold transition-colors">Explore</Link>
          <Link href="/progress" className="text-slate-300 hover:text-white font-semibold transition-colors">Journey</Link>
          <Link href="/about" className="text-slate-300 hover:text-white font-semibold transition-colors">About</Link>
          {user && (
            <Link href="/creator" className="text-slate-300 hover:text-white font-semibold transition-colors">
              {user.role === "CREATOR" || user.role === "ADMIN" ? "Creator" : "Become a Creator"}
            </Link>
          )}
          {user?.isAdmin && (
            <Link href="/admin" className="text-slate-300 hover:text-white font-semibold transition-colors">
              Admin
            </Link>
          )}
          {user && (
            <ProfileBubbleChip avatarUrl={user.profile?.avatarUrl} displayName={user.profile?.displayName || user.email} onClick={() => window.location.href = "/profile"} />
          )}
        </nav>
      </div>
    </header>
  );
}
