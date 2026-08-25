import { useEffect, useState } from 'react'
import { ShieldAlert, ScanLine, Gauge, Ban } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js'
import { api, type DashboardStats, type IncidentRecord } from '../api/client'
import StatCard from '../components/StatCard'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const LEVEL_COLOR: Record<string, string> = {
  SAFE: '#2DD4BF',
  SUSPICIOUS: '#F5B942',
  HIGH_RISK: '#F0673A',
  BLOCK: '#E5484D',
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])

  async function load() {
    const [s, i] = await Promise.all([api.dashboardStats(), api.dashboardIncidents(15)])
    setStats(s)
    setIncidents(i)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const levels = ['SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'BLOCK']
  const channels = Object.keys(stats?.by_channel ?? {})

  return (
    <div className="mx-auto max-w-7xl px-6 py-14">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink50">Fraud Analytics Dashboard</h1>
        <p className="text-ink500 mt-1.5">Live view for banks and investigators — updates every 5s.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Scanned" value={stats?.total_scanned ?? 0} icon={ScanLine} accent="#22D3EE" />
        <StatCard label="Avg Risk Score" value={stats?.avg_risk_score ?? 0} icon={Gauge} accent="#F5B942" />
        <StatCard label="High Risk / Blocked" value={stats?.blocked_or_high_risk ?? 0} icon={Ban} accent="#E5484D" />
        <StatCard label="Channels Monitored" value={channels.length} icon={ShieldAlert} accent="#2DD4BF" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-ink-border bg-ink-panel p-6">
          <h3 className="font-display font-semibold text-ink50 mb-4">Risk level distribution</h3>
          {stats && stats.total_scanned > 0 ? (
            <Doughnut
              data={{
                labels: levels,
                datasets: [
                  {
                    data: levels.map((l) => stats.by_level[l] ?? 0),
                    backgroundColor: levels.map((l) => LEVEL_COLOR[l]),
                    borderColor: '#101828',
                    borderWidth: 3,
                  },
                ],
              }}
              options={{ plugins: { legend: { labels: { color: '#96A3C4', font: { family: 'Inter' } } } } }}
            />
          ) : (
            <EmptyState />
          )}
        </div>
        <div className="rounded-xl border border-ink-border bg-ink-panel p-6">
          <h3 className="font-display font-semibold text-ink50 mb-4">Scans by channel</h3>
          {channels.length > 0 ? (
            <Bar
              data={{
                labels: channels,
                datasets: [
                  {
                    label: 'Scans',
                    data: channels.map((c) => stats?.by_channel[c] ?? 0),
                    backgroundColor: '#22D3EE99',
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#96A3C4' }, grid: { color: '#22304A' } },
                  y: { ticks: { color: '#96A3C4' }, grid: { color: '#22304A' }, beginAtZero: true },
                },
              }}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-ink-border bg-ink-panel p-6">
        <h3 className="font-display font-semibold text-ink50 mb-4">Recent incidents</h3>
        {incidents.length === 0 ? (
          <EmptyState text="No scans yet — try the Link, QR or UPI checkers." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink500 font-mono text-xs border-b border-ink-border">
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Channel</th>
                  <th className="pb-3 pr-4">Target</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3">Level</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} className="border-b border-ink-border/60">
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink500">
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 pr-4 capitalize text-ink300">{inc.channel}</td>
                    <td className="py-2.5 pr-4 font-mono text-ink50 max-w-xs truncate">{inc.target}</td>
                    <td className="py-2.5 pr-4 font-mono text-ink50">{inc.risk_score}</td>
                    <td className="py-2.5">
                      <span
                        className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          color: LEVEL_COLOR[inc.risk_level],
                          backgroundColor: `${LEVEL_COLOR[inc.risk_level]}1A`,
                          border: `1px solid ${LEVEL_COLOR[inc.risk_level]}40`,
                        }}
                      >
                        {inc.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ text = 'No data yet.' }: { text?: string }) {
  return <p className="text-ink500 text-sm py-10 text-center">{text}</p>
}
