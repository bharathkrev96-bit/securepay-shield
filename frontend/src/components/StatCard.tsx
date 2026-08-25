import type { LucideIcon } from 'lucide-react'

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = '#22D3EE',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-panel p-5 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}1A`, border: `1px solid ${accent}40` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <div className="font-mono text-2xl font-semibold text-ink50">{value}</div>
        <div className="text-xs text-ink500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}
