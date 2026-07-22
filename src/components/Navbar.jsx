import React from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react";

export default function Navbar() {
  return (
    <header className="w-full py-5 px-6 md:px-12 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 group">
        <span className="w-2.5 h-2.5 rounded-full bg-teal group-hover:bg-lavender transition-colors" />
        <span className="font-display text-lg tracking-tight text-ink">Mindful Check-In</span>
      </Link>

      <nav className="flex items-center gap-4">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-muted hover:text-ink transition-colors">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>
    </header>
  );
}
