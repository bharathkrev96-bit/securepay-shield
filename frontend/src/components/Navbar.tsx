import { NavLink } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

const links = [
  { to: '/', label: 'Home' },
  { to: '/url', label: 'Link Scanner' },
  { to: '/qr', label: 'QR Scanner' },
  { to: '/upi', label: 'UPI Check' },
  { to: '/dashboard', label: 'Dashboard' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-border bg-ink/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-signal-cyan" strokeWidth={2} />
            <span className="absolute inset-0 rounded-full animate-pulseRing bg-signal-cyan/30" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            SecurePay<span className="text-signal-cyan">Shield</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-panel2 text-ink50'
                    : 'text-ink300 hover:text-ink50 hover:bg-ink-panel2/60'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
