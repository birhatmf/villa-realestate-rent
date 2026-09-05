/** Header/Footer'sız araç kabuğu — admin panelindeki gibi tam ekran, host'un
 * "Villalarım" alanı için. app/admin/layout.tsx ile aynı fikir. */
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas">{children}</div>;
}
