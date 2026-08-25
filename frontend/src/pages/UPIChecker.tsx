import { useState } from 'react'
import { Wallet, Loader2 } from 'lucide-react'
import { api, type UPICheckResponse } from '../api/client'
import RiskGauge from '../components/RiskGauge'
import SignalList from '../components/SignalList'
import { PageHeader } from './URLChecker'

export default function UPIChecker() {
  const [upiId, setUpiId] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UPICheckResponse | null>(null)
  const [error, setError] = useState('')

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    if (!upiId.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.checkUpi(upiId.trim(), payeeName.trim() || undefined)
      setResult(res)
    } catch {
      setError('Could not reach the analysis engine. Is the backend running on :8000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <PageHeader icon={Wallet} title="UPI Check" desc="Validate a UPI ID / merchant VPA before you approve a payment request." />

      <form onSubmit={handleCheck} className="rounded-xl border border-ink-border bg-ink-panel p-6 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block font-mono text-xs text-ink500 mb-2">UPI ID / VPA</label>
          <input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="e.g. merchant.store@okhdfcbank"
            className="w-full rounded-lg bg-ink-panel2 border border-ink-border px-4 py-3 text-sm font-mono text-ink50 placeholder:text-ink500 focus:border-signal-cyan/60 outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block font-mono text-xs text-ink500 mb-2">DISPLAYED PAYEE NAME (optional)</label>
          <input
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            placeholder="e.g. Mocha Cafe"
            className="w-full rounded-lg bg-ink-panel2 border border-ink-border px-4 py-3 text-sm font-mono text-ink50 placeholder:text-ink500 focus:border-signal-cyan/60 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-signal-cyan text-ink font-semibold text-sm hover:brightness-110 transition disabled:opacity-60 w-fit"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Validating…' : 'Validate UPI ID'}
        </button>
        {error ? <p className="sm:col-span-2 text-signal-risk text-sm">{error}</p> : null}
      </form>

      {result ? (
        <div className="mt-8 grid md:grid-cols-[220px_1fr] gap-8">
          <div className="flex flex-col items-center">
            <RiskGauge score={result.verdict.score} level={result.verdict.level} />
            <div className="mt-4 text-center">
              <div className="font-mono text-xs text-ink500">FORMAT</div>
              <div className={`font-mono text-sm mt-1 ${result.is_valid_format ? 'text-signal-safe' : 'text-signal-block'}`}>
                {result.is_valid_format ? 'Valid VPA structure' : 'Invalid VPA structure'}
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="font-mono text-xs text-ink500">PROVIDER</div>
              <div className={`font-mono text-sm mt-1 ${result.provider ? 'text-signal-cyan' : 'text-ink500'}`}>
                {result.provider ?? 'Unrecognized handle'}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-display font-semibold text-ink50 mb-3">Signal breakdown</h3>
            <SignalList signals={result.verdict.signals} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
