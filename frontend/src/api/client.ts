const BASE = '/api'

export type SignalDetail = {
  name: string
  triggered: boolean
  weight: number
  detail: string
}

export type RiskVerdict = {
  score: number
  level: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK' | 'BLOCK'
  action: string
  signals: SignalDetail[]
}

export type URLCheckResponse = {
  url: string
  normalized_url: string
  domain: string
  verdict: RiskVerdict
}

export type UPICheckResponse = {
  upi_id: string
  is_valid_format: boolean
  psp_handle: string
  provider: string | null
  verdict: RiskVerdict
}

export type QRCheckResponse = {
  decoded: boolean
  payload_type: 'upi' | 'url' | 'unknown' | 'none'
  raw_payload: string | null
  url_result: URLCheckResponse | null
  upi_result: UPICheckResponse | null
  qr_structure_flags: SignalDetail[]
  verdict: RiskVerdict
}

export type DashboardStats = {
  total_scanned: number
  avg_risk_score: number
  blocked_or_high_risk: number
  by_level: Record<string, number>
  by_channel: Record<string, number>
}

export type IncidentRecord = {
  id: string
  timestamp: string
  channel: string
  target: string
  risk_score: number
  risk_level: string
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export const api = {
  checkUrl: (url: string, source_channel = 'manual') =>
    post<URLCheckResponse>('/analyze/url', { url, source_channel }),

  checkUpi: (upi_id: string, payee_name?: string) =>
    post<UPICheckResponse>('/analyze/upi', { upi_id, payee_name }),

  checkQr: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/analyze/qr`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.json() as Promise<QRCheckResponse>
  },

  dashboardStats: async () => {
    const res = await fetch(`${BASE}/dashboard/stats`)
    return res.json() as Promise<DashboardStats>
  },

  dashboardIncidents: async (limit = 50) => {
    const res = await fetch(`${BASE}/dashboard/incidents?limit=${limit}`)
    return res.json() as Promise<IncidentRecord[]>
  },
}
