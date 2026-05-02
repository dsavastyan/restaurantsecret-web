import React from "react";

export default function HomeIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`rs-home-icon ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path
          d="M3.5 11.25 12 4.2l8.5 7.05v7.1a1.65 1.65 0 0 1-1.65 1.65H15.3v-5.1a1.1 1.1 0 0 0-1.1-1.1h-4.4a1.1 1.1 0 0 0-1.1 1.1V20H5.15a1.65 1.65 0 0 1-1.65-1.65v-7.1Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
