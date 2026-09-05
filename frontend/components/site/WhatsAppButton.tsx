type Config = {
  enabled?: boolean;
  phone?: string;
  message?: string;
  label?: string;
  position?: 'left' | 'right';
};

/** floating=false: admin öngösteriminde kendi kabında konumlandırılır. */
export default function WhatsAppButton({
  config,
  floating = true,
}: {
  config?: Config;
  floating?: boolean;
}) {
  const phone = config?.phone?.replace(/\D/g, '');
  if (config?.enabled === false || !phone) return null;

  const href = `https://wa.me/${phone}${
    config?.message ? `?text=${encodeURIComponent(config.message)}` : ''
  }`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={config?.label || 'WhatsApp’tan yazın'}
      className={`group flex items-center gap-0 overflow-hidden rounded-full bg-ink px-4 py-3.5 text-canvas shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition-all duration-500 hover:bg-[#25D366] hover:text-white ${
        floating
          ? `fixed bottom-6 z-40 ${config?.position === 'left' ? 'left-6' : 'right-6'}`
          : 'relative'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5 shrink-0">
        <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 1.8a8.2 8.2 0 11-4.2 15.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 0112 3.8zm-3.3 4c-.2 0-.5 0-.7.4-.2.4-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.2.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.2c-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.1-.3 0-.4.1-.6l.5-.6c.2-.2.2-.3.3-.5v-.5c-.1-.2-.7-1.7-.9-2.3-.2-.5-.4-.5-.6-.5z" />
      </svg>
      {config?.label && (
        <span className="max-w-0 whitespace-nowrap text-[0.88rem] opacity-0 transition-all duration-500 group-hover:ml-2.5 group-hover:max-w-[16rem] group-hover:opacity-100">
          {config.label}
        </span>
      )}
    </a>
  );
}
