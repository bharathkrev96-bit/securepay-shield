import { useRef, useState } from 'react'
import { QrCode, Loader2, UploadCloud } from 'lucide-react'
import { api, type QRCheckResponse } from '../api/client'
import RiskGauge from '../components/RiskGauge'
import SignalList from '../components/SignalList'
import { PageHeader } from './URLChecker'

export default function QRChecker() {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QRCheckResponse | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.checkQr(file)
      setResult(res)
    } catch {
      setError('Could not reach the analysis engine. Is the backend running on :8000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <PageHeader icon={QrCode} title="QR Scanner" desc="Upload a payment QR code to verify it decodes to a legitimate UPI ID or link before you scan-to-pay." />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) handleFile(f)
        }}
        className="rounded-xl border-2 border-dashed border-ink-border bg-ink-panel p-10 text-center cursor-pointer hover:border-signal-cyan/50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {preview ? (
          <img src={preview} alt="QR preview" className="mx-auto max-h-48 rounded-lg border border-ink-border" />
        ) : (
          <>
            <UploadCloud className="w-8 h-8 text-signal-cyan mx-auto mb-3" />
            <p className="text-ink50 font-medium">Drop a QR image here, or click to upload</p>
            <p className="text-ink500 text-sm mt-1">PNG, JPG — screenshot of any payment QR works</p>
          </>
        )}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-ink300">
          <Loader2 className="w-4 h-4 animate-spin" /> Decoding and analyzing QR payload…
        </div>
      ) : null}
      {error ? <p className="mt-4 text-signal-risk text-sm">{error}</p> : null}

      {result ? (
        <div className="mt-8">
          {!result.decoded ? (
            <div className="rounded-xl border border-signal-risk/30 bg-signal-risk/5 p-6">
              <p className="text-signal-risk font-medium">Could not decode a QR code from this image.</p>
              <div className="mt-4">
                <SignalList signals={result.qr_structure_flags} />
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-[220px_1fr] gap-8">
              <div className="flex flex-col items-center">
                <RiskGauge score={result.verdict.score} level={result.verdict.level} />
                <div className="mt-4 text-center">
                  <div className="font-mono text-xs text-ink500">PAYLOAD TYPE</div>
                  <div className="font-mono text-sm text-ink50 mt-1 uppercase">{result.payload_type}</div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-lg bg-ink-panel2/50 border border-ink-border p-4">
                  <div className="font-mono text-xs text-ink500 mb-1">DECODED PAYLOAD</div>
                  <div className="font-mono text-sm text-ink50 break-all">{result.raw_payload}</div>
                  {result.upi_result ? (
                    <div className="mt-3 pt-3 border-t border-ink-border grid grid-cols-2 gap-3 text-sm">
                      <Field label="VPA" value={result.upi_result.upi_id} />
                      <Field label="PSP Handle" value={`@${result.upi_result.psp_handle}`} />
                      <Field label="Provider" value={result.upi_result.provider ?? 'Unrecognized'} />
                    </div>
                  ) : null}
                  {result.url_result ? (
                    <div className="mt-3 pt-3 border-t border-ink-border">
                      <Field label="Domain" value={result.url_result.domain} />
                    </div>
                  ) : null}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-ink50 mb-3">Signal breakdown</h3>
                  <SignalList
                    signals={[
                      ...result.qr_structure_flags,
                      ...(result.upi_result?.verdict.signals ?? []),
                      ...(result.url_result?.verdict.signals ?? []),
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] text-ink500">{label}</div>
      <div className="font-mono text-ink50 mt-0.5">{value}</div>
    </div>
  )
}
