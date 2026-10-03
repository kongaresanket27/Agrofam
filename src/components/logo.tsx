export function Mark({ className = "size-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="12" fill="#E7F6EC" />
      <path
        d="M24 10c-2.2 5.4-8 8.8-8 16.2 0 5 3.4 9.3 8 10.6 4.6-1.3 8-5.6 8-10.6C32 18.8 26.2 15.4 24 10Z"
        fill="#1B7A4A"
      />
      <path
        d="M24 14.5c1.5 3.6 5.4 6 5.4 10.8 0 2.8-1.7 5.2-4.2 6.2"
        fill="none"
        stroke="#F4C430"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M24 22v14" stroke="#E7F6EC" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Mark className="size-9" />
      <span className={light ? "text-lg font-bold text-white" : "text-lg font-bold text-fg"}>
        AgroFam
      </span>
    </div>
  );
}
