import { Link } from 'react-router-dom'
import { Link2, QrCode, LandPlot, ArrowRight, MessageSquareWarning, Wallet } from 'lucide-react'

const channels = [
  { icon: MessageSquareWarning, label: 'SMS / WhatsApp / Telegram' },
  { icon: Link2, label: 'Email & Links' },
  { icon: QrCode, label: 'QR Payment Codes' },
  { icon: Wallet, label: 'UPI Merchant IDs' },
]

const steps = [
  ['01', 'Data Collection', 'SMS, email, WhatsApp, QR codes, UPI IDs and URLs are captured at the point of entry.'],
  ['02', 'Preprocessing', 'URLs normalized, QR payloads decoded, merchant details and domains extracted.'],
  ['03', 'AI Analysis', 'Phishing, brand-impersonation, typosquat and QR-tamper signals scored in parallel.'],
  ['04', 'Risk Scoring', 'Weighted signals fused into a single 0-100 fraud score, explainable end to end.'],
  ['05', 'User Alert', 'Safe to proceed, warning, or block — decided before money moves.'],
  ['06', 'Dashboard', 'Banks and investigators see live threat patterns across every channel.'],
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-border">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-signal-cyan/30 bg-signal-cyan/5 text-signal-cyan text-xs font-mono mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-cyan animate-pulse" />
              CROSS-CHANNEL FRAUD DETECTION
            </div>
            <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight text-ink50">
              Stop the payment,
              <br />
              not just the <span className="text-signal-cyan">alert.</span>
            </h1>
            <p className="mt-6 text-ink300 text-lg leading-relaxed max-w-lg">
              SecurePay Shield correlates phishing links, tampered QR codes, and suspicious UPI
              IDs across every channel — SMS, email, WhatsApp, Telegram — into a single fraud
              score, before a rupee leaves the account.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/url"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-signal-cyan text-ink font-semibold text-sm hover:brightness-110 transition"
              >
                Scan a link <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-ink-border text-ink50 font-semibold text-sm hover:bg-ink-panel2 transition"
              >
                View threat dashboard
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {channels.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-ink500 text-sm">
                  <c.icon className="w-4 h-4 text-signal-cyan/70" />
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Signature element: live scan panel */}
          <div className="relative rounded-2xl border border-ink-border bg-ink-panel overflow-hidden shadow-glow">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-signal-cyan/10 to-transparent animate-scan" />
            </div>
            <div className="relative p-6 border-b border-ink-border flex items-center justify-between">
              <span className="font-mono text-xs text-ink500">LIVE_SCAN.PREVIEW</span>
              <span className="font-mono text-xs text-signal-safe">● ENGINE ONLINE</span>
            </div>
            <div className="relative p-6 space-y-3">
              <ScanLine text="hxxp://hdfc-secure-kyc-verify.top/login" tag="TYPOSQUAT" color="#E5484D" />
              <ScanLine text="upi://pay?pa=9482xxxxxx@oksbi&am=4999" tag="RANDOM ID" color="#F5B942" />
              <ScanLine text="upi://pay?pa=cafe.mocha@okhdfcbank" tag="VERIFIED" color="#2DD4BF" />
              <ScanLine text="hxxps://bit.ly/win-prize-now" tag="SHORTENER" color="#F0673A" />
            </div>
            <div className="relative p-6 pt-2 grid grid-cols-3 gap-3">
              <MiniStat label="Signals tracked" value="20+" />
              <MiniStat label="Channels covered" value="6" />
              <MiniStat label="Decision" value="< 400ms" />
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink50">System workflow</h2>
            <p className="text-ink500 text-sm mt-1">Six stages, one continuous pipeline from raw signal to blocked payment.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map(([n, title, desc]) => (
            <div key={n} className="rounded-xl border border-ink-border bg-ink-panel p-5 hover:border-signal-cyan/40 transition-colors">
              <span className="font-mono text-signal-cyan/70 text-sm">{n}</span>
              <h3 className="font-display font-semibold text-ink50 mt-2">{title}</h3>
              <p className="text-ink500 text-sm mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA row */}
      <section className="mx-auto max-w-7xl px-6 pb-24 grid md:grid-cols-3 gap-5">
        <CtaCard to="/url" icon={Link2} title="Link Scanner" desc="Check any SMS, email or chat link for phishing and brand impersonation." />
        <CtaCard to="/qr" icon={QrCode} title="QR Scanner" desc="Upload a payment QR to verify it before you scan-to-pay." />
        <CtaCard to="/upi" icon={LandPlot} title="UPI Check" desc="Validate a UPI ID / merchant handle before sending money." />
      </section>
    </div>
  )
}

function ScanLine({ text, tag, color }: { text: string; tag: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-ink-panel2/60 border border-ink-border px-3 py-2.5">
      <span className="font-mono text-xs text-ink300 truncate">{text}</span>
      <span
        className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}40` }}
      >
        {tag}
      </span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-panel2/40 border border-ink-border px-3 py-2.5">
      <div className="font-mono text-sm text-ink50 font-semibold">{value}</div>
      <div className="text-[11px] text-ink500 mt-0.5">{label}</div>
    </div>
  )
}

function CtaCard({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-ink-border bg-ink-panel p-6 hover:border-signal-cyan/50 hover:bg-ink-panel2/60 transition-colors"
    >
      <Icon className="w-6 h-6 text-signal-cyan" />
      <h3 className="font-display font-semibold text-ink50 mt-4">{title}</h3>
      <p className="text-ink500 text-sm mt-1.5 leading-relaxed">{desc}</p>
      <span className="inline-flex items-center gap-1 text-signal-cyan text-sm font-medium mt-4 group-hover:gap-2 transition-all">
        Try it <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  )
}
