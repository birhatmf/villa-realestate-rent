/** Sadeleştirilmiş, tek çizgi kalınlığında sosyal ikonlar (tasarım diliyle uyumlu). */
const ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="16.9" cy="7.1" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path d="M14.6 8.4H16V5.6h-2.2c-2 0-3.2 1.2-3.2 3.2v1.4H8.4v2.8h2.2V21h2.9v-8h2.2l.4-2.8h-2.6V9.2c0-.5.3-.8 1.1-.8z" />
  ),
  x: (
    <>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.4 9.4l4.6 2.6-4.6 2.6z" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5V17" />
      <path d="M8 7.4v.01" />
      <path d="M12 17v-3.6a2.2 2.2 0 014.4 0V17" />
    </>
  ),
  tiktok: (
    <path d="M15 4c.4 2.2 1.9 3.7 4 3.9v2.9c-1.5 0-2.9-.5-4-1.3V15a5 5 0 11-5-5c.3 0 .7 0 1 .1V13a2.1 2.1 0 101.5 2V4H15z" />
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 20l1.6-6.2" />
      <path d="M9.2 11.4c0-1.9 1.4-3.3 3.2-3.3 1.7 0 2.9 1.1 2.9 2.8 0 1.9-1 3.4-2.5 3.4-.8 0-1.4-.6-1.2-1.4" />
    </>
  ),
};

export default function SocialIcon({ platform }: { platform: string }) {
  const icon = ICONS[platform];
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-[1.15rem] w-[1.15rem]"
    >
      {icon}
    </svg>
  );
}
