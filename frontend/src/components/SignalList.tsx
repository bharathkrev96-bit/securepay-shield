import { CheckCircle2, AlertTriangle } from 'lucide-react'
import type { SignalDetail } from '../api/client'

export default function SignalList({ signals }: { signals: SignalDetail[] }) {
  const sorted = [...signals].sort((a, b) => Number(b.triggered) - Number(a.triggered) || b.weight - a.weight)
  return (
    <div className="space-y-2">
      {sorted.map((s) => {
        // A signal only counts as "risky" if it's triggered AND actually
        // carries weight. weight:0 signals are informational/positive
        // (e.g. "phone number style ID -- normal"), not a warning.
        const isRisk = s.triggered && s.weight > 0
        return (
          <div
            key={s.name}
            className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${
              isRisk
                ? 'border-signal-risk/30 bg-signal-risk/5'
                : 'border-ink-border bg-ink-panel2/40'
            }`}
          >
            {isRisk ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-signal-risk" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-signal-safe/70" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-mono text-xs uppercase tracking-wide ${isRisk ? 'text-signal-risk' : 'text-ink500'}`}>
                  {s.name.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-[11px] text-ink500">w:{s.weight}</span>
              </div>
              <p className="text-ink300 mt-0.5 leading-snug">{s.detail}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}