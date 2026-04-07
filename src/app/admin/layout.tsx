// Admin-specific layout — overrides the root body overflow:hidden
// that is needed for the canvas-based main page but breaks admin scrolling.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-y-auto">
      {children}
    </div>
  );
}
