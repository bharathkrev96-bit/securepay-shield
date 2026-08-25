import { useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'
import { api, type URLCheckResponse } from '../api/client'
import RiskGauge from '../components/RiskGauge'
import SignalList from '../components/SignalList'

const CHANNELS = ['sms', 'email', 'whatsapp', 'telegram', 'manual']

export default function URLChecker() {
  const [url, setUrl] = useState('')
  const [channel, setChannel] = useState('manual')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<URLCheckResponse | null>(null)
  const [error, setError] = useState('')

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.checkUrl(url.trim(), channel)
      setResult(res)
    } catch {
      setError('Could not reach the analysis engine. Is the backend running on :8000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <PageHeader icon={Link2} title="Link Scanner" desc="Paste a link from any channel to check for phishing, typosquatting and brand impersonation." />

      <form onSubmit={handleCheck} className="rounded-xl border border-ink-border bg-ink-panel p-6">
        <label className="block font-mono text-xs text-ink500 mb-2">URL TO ANALYZE</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="e.g. hdfc-secure-kyc-verify.top/login"
          className="w-full rounded-lg bg-ink-panel2 border border-ink-border px-4 py-3 text-sm font-mono text-ink50 placeholder:text-ink500 focus:border-signal-cyan/60 outline-none"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink500 mr-1">SOURCE:</span>
          {CHANNELS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setChannel(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono capitalize border transition-colors ${
                channel === c
                  ? 'border-signal-cyan/50 bg-signal-cyan/10 text-signal-cyan'
                  : 'border-ink-border text-ink500 hover:text-ink300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-signal-cyan text-ink font-semibold text-sm hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Analyzing…' : 'Analyze Link'}
        </button>
        {error ? <p className="mt-3 text-signal-risk text-sm">{error}</p> : null}
      </form>

      {result ? (
        <div className="mt-8 grid md:grid-cols-[220px_1fr] gap-8">
          <div className="flex flex-col items-center">
            <RiskGauge score={result.verdict.score} level={result.verdict.level} />
            <div className="mt-4 text-center">
              <div className="font-mono text-xs text-ink500">DOMAIN</div>
              <div className="font-mono text-sm text-ink50 mt-1 break-all">{result.domain}</div>
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

export function PageHeader({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="mb-8">
      <div className="w-11 h-11 rounded-xl bg-signal-cyan/10 border border-signal-cyan/30 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-signal-cyan" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink50">{title}</h1>
      <p className="text-ink500 mt-1.5">{desc}</p>
    </div>
  )
}
