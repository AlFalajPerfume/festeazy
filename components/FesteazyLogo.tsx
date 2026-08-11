"use client";

import Image from "next/image";
import Link from "next/link";

type FesteazyLogoProps = {
  href?: string;
  dark?: boolean;
  compact?: boolean;
};

export default function FesteazyLogo({
  href = "/",
  dark = false,
  compact = false,
}: FesteazyLogoProps) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md shadow-violet-900/10 ring-1 ring-violet-100">
        <Image
          src="/brand/festeazy-logo.png"
          alt="Festeazy Logo"
          width={48}
          height={48}
          className="h-full w-full object-contain p-1"
          priority
        />
      </div>

      {!compact && (
        <div className="leading-none">
          <p
            className={`text-xl font-black tracking-[-0.05em] ${
              dark ? "text-white" : "text-slate-950"
            }`}
          >
            <span>fest</span>
            <span className="text-violet-600">easy</span>
          </p>

          <p
            className={`mt-1 text-xs font-bold ${
              dark ? "text-white/45" : "text-slate-500"
            }`}
          >
            Make your fest easy
          </p>
        </div>
      )}
    </Link>
  );
}