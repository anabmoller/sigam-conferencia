import { Navbar } from './Navbar.jsx';

export function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
      <footer className="border-t border-sigam-border py-4 text-xs text-center text-sigam-muted">
        SIGAM Trazabilidad — movimientos individuales con base en la guía SENACSA
      </footer>
    </div>
  );
}
