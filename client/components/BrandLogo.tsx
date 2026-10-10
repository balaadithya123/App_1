import { useEffect } from "react";

const FONT_LINK_ID = "builderco-brand-fonts";

export function ensureBrandFonts() {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

interface BrandLogoProps { className?: string }

export default function BrandLogo({ className = "h-7 w-auto" }: BrandLogoProps) {
  useEffect(() => { ensureBrandFonts(); }, []);
  return (
    <svg
      role="img"
      aria-label="Builderco"
      className={`${className} text-[#18181B] dark:text-[#FAFAFA]`}
      fill="none"
      viewBox="0 0 160 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(4, 4)">
        <path d="M0 0H18C23.5228 0 28 4.47715 28 10C28 13.626 26.0624 16.8005 23.1611 18.5385C26.7022 20.1884 29.1429 23.8118 29.1429 28C29.1429 34.0751 24.218 39 18.1429 39H0V0Z" fill="currentColor" />
        <path d="M9 7.5H16.5C18.433 7.5 20 9.067 20 11C20 12.933 18.433 14.5 16.5 14.5H9V7.5Z" className="fill-white dark:fill-[#09090B]" />
        <path d="M9 22H17.5C19.9853 22 22 24.0147 22 26.5C22 28.9853 19.9853 31 17.5 31H9V22Z" className="fill-white dark:fill-[#09090B]" />
        <rect fill="#F95738" height="9" rx="2" width="9" x="23" y="27" />
      </g>
      <text fill="currentColor" fontFamily="'Space Grotesk', system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.03em" x="46" y="27">
        Builder<tspan fill="#F95738">co</tspan>
      </text>
    </svg>
  );
}
