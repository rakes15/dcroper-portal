import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getUsers } from '../api/users';
import type { User } from '../api/users';

type Period = '7d' | '30d' | 'all';

const STATUS_COLOR: Record<string, string> = {
  approved:  '#10b981',
  submitted: '#f59e0b',
  pending:   '#f59e0b',
  finalized: '#6366f1',
  rejected:  '#ef4444',
  draft:     '#9ca3af',
};

const GEO_COLOR: Record<string, string> = {
  point:      '#3b82f6',
  polygon:    '#40916c',
  linestring: '#f59e0b',
};

export default function SurveyAnalytics() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    Promise.all([getSurveys(), getProjects(), getUsers()])
      .then(([s, p, u]) => {
        setSurveys(s.data);
        setProjects(p.data);
        setUsers(u.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Period filter ─────────────────────────────────────────────
  const cutoff =
    period === 'all'
      ? null
      : new Date(Date.now() - (period === '7d' ? 7 : 30) * 86_400_000);
  const filtered = cutoff
    ? surveys.filter((s) => new Date(s.created_at) >= cutoff)
    : surveys;

  // ── Summary stats ─────────────────────────────────────────────
  const total    = filtered.length;
  const approved = filtered.filter((s) => s.status === 'approved').length;
  const rejected = filtered.filter((s) => s.status === 'rejected').length;
  const pendingQc = filtered.filter((s) => s.status === 'submitted' || s.status === 'pending').length;
  const reviewed  = approved + rejected;
  const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null;

  const oldestMs = surveys.length
    ? Math.min(...surveys.map((s) => new Date(s.created_at).getTime()))
    : Date.now();
  const spanDays =
    period === '7d' ? 7
    : period === '30d' ? 30
    : Math.max(1, Math.ceil((Date.now() - oldestMs) / 86_400_000));
  const avgPerDay = (total / spanDays).toFixed(1);

  // ── 30-day trend chart (always full 30 days) ──────────────────
  const trendDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const dayBucket: Record<string, number> = {};
  for (const d of trendDays) dayBucket[d] = 0;
  for (const s of surveys) {
    const day = s.created_at.slice(0, 10);
    if (dayBucket[day] !== undefined) dayBucket[day]++;
  }
  const dayCounts = trendDays.map((d) => dayBucket[d]);
  const maxDay = Math.max(...dayCounts, 1);

  // ── Status breakdown ──────────────────────────────────────────
  const byStatus: Record<string, number> = {};
  for (const s of filtered) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  const statusEntries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(...statusEntries.map(([, c]) => c), 1);

  // ── Geometry type ─────────────────────────────────────────────
  const byGeo: Record<string, number> = {};
  for (const s of filtered) {
    const g = s.geometry_type || 'unknown';
    byGeo[g] = (byGeo[g] || 0) + 1;
  }
  const geoEntries = Object.entries(byGeo).sort((a, b) => b[1] - a[1]);
  const maxGeo = Math.max(...geoEntries.map(([, c]) => c), 1);

  // ── Agent performance ─────────────────────────────────────────
  const agentBucket: Record<string, {
    name: string; total: number; approved: number; rejected: number; pendingQc: number;
  }> = {};
  for (const s of filtered) {
    const uid = s.user_id || 'unknown';
    const u = users.find((u) => u.id === uid);
    if (!agentBucket[uid])
      agentBucket[uid] = { name: u?.name || s.assigned_to_name || uid.slice(0, 8), total: 0, approved: 0, rejected: 0, pendingQc: 0 };
    agentBucket[uid].total++;
    if (s.status === 'approved') agentBucket[uid].approved++;
    if (s.status === 'rejected') agentBucket[uid].rejected++;
    if (s.status === 'submitted' || s.status === 'pending') agentBucket[uid].pendingQc++;
  }
  const agents = Object.entries(agentBucket)
    .map(([uid, v]) => ({
      uid, ...v,
      rate: (v.approved + v.rejected) > 0
        ? Math.round((v.approved / (v.approved + v.rejected)) * 100)
        : null,
    }))
    .sort((a, b) => b.total - a.total);

  // ── Project distribution ──────────────────────────────────────
  const projectBucket: Record<string, { name: string; total: number; approved: number; pending: number }> = {};
  for (const s of filtered) {
    const p = projects.find((p) => p.id === s.project_id);
    if (!projectBucket[s.project_id])
      projectBucket[s.project_id] = { name: p?.name || s.project_id.slice(0, 8), total: 0, approved: 0, pending: 0 };
    projectBucket[s.project_id].total++;
    if (s.status === 'approved') projectBucket[s.project_id].approved++;
    if (s.status === 'submitted' || s.status === 'pending') projectBucket[s.project_id].pending++;
  }
  const projectDist = Object.entries(projectBucket)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total);
  const maxProject = Math.max(...projectDist.map((p) => p.total), 1);

  // Chart layout
  const chartW = 600, chartH = 100;
  const barW = Math.max(4, (chartW / 30) - 2);

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading analytics…</div>;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Survey Analytics</h1>
          <p className="page-subtitle">{surveys.length} total surveys across {projects.length} projects</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#f0faf4', borderRadius: 8, padding: 4 }}>
          {(['7d', '30d', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: period === p ? '#40916c' : 'transparent',
                color: period === p ? '#fff' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              {p === 'all' ? 'All time' : `Last ${p}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Total Surveys</div>
          <div className="stat-value">{total}</div>
          {period !== 'all' && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>last {period}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: '#059669' }}>{approved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{rejected}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending QC</div>
          <div className="stat-value" style={{ color: pendingQc > 0 ? '#d97706' : undefined }}>{pendingQc}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approval Rate</div>
          <div className="stat-value" style={{ color: '#40916c' }}>
            {approvalRate !== null ? `${approvalRate}%` : '—'}
          </div>
          {reviewed > 0 && (
            <div style={{ marginTop: 6, height: 4, background: '#e0f0e6', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${approvalRate}%`, background: '#40916c', borderRadius: 99 }} />
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg / Day</div>
          <div className="stat-value">{avgPerDay}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>over {spanDays}d</div>
        </div>
      </div>

      {/* ── 30-day trend chart ── */}
      <div className="table-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 16, color: '#1a3a2a', fontSize: 14 }}>30-Day Trend</div>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${chartW} ${chartH + 24}`} style={{ width: '100%', minWidth: 320 }}>
            {dayCounts.map((count, i) => {
              const bH = count === 0 ? 2 : Math.max(4, (count / maxDay) * chartH);
              const x = i * (chartW / 30) + 1;
              return (
                <g key={i}>
                  <rect x={x} y={chartH - bH} width={barW} height={bH} fill={count === 0 ? '#e0f0e6' : '#40916c'} rx={2} />
                  {count > 0 && (
                    <text x={x + barW / 2} y={chartH - bH - 3} textAnchor="middle" fontSize={9} fill="#374151">{count}</text>
                  )}
                </g>
              );
            })}
            {trendDays
              .map((d, i) => ({ d, i }))
              .filter(({ i }) => i % 5 === 0 || i === 29)
              .map(({ d, i }) => (
                <text key={d} x={i * (chartW / 30) + barW / 2 + 1} y={chartH + 16} textAnchor="middle" fontSize={9} fill="#9ca3af">
                  {d.slice(5)}
                </text>
              ))}
          </svg>
        </div>
      </div>

      {/* ── Status + Geometry breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a', fontSize: 14 }}>Status Breakdown</div>
          {statusEntries.length === 0
            ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No surveys in period</div>
            : statusEntries.map(([status, count]) => (
              <div key={status} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', color: '#374151' }}>{status}</span>
                  <span style={{ fontWeight: 600, color: STATUS_COLOR[status] || '#374151' }}>
                    {count}{' '}
                    <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                      ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <div style={{ height: 8, background: '#f0faf4', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: STATUS_COLOR[status] || '#9ca3af', width: `${(count / maxStatus) * 100}%`, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))
          }
        </div>

        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a', fontSize: 14 }}>Geometry Type</div>
          {geoEntries.length === 0
            ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No surveys in period</div>
            : geoEntries.map(([geo, count]) => (
              <div key={geo} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', color: '#374151' }}>{geo}</span>
                  <span style={{ fontWeight: 600, color: GEO_COLOR[geo] || '#374151' }}>
                    {count}{' '}
                    <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                      ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <div style={{ height: 8, background: '#f0faf4', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: GEO_COLOR[geo] || '#6b7280', width: `${(count / maxGeo) * 100}%`, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Agent performance ── */}
      {agents.length > 0 && (
        <div className="table-card" style={{ marginBottom: 16 }}>
          <div className="table-header">
            <span className="table-title">Agent Performance</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Agent</th>
                <th>Total</th>
                <th>Approved</th>
                <th>Rejected</th>
                <th>Pending QC</th>
                <th style={{ width: 160 }}>Approval Rate</th>
                <th style={{ width: 64 }}>% of All</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a, i) => (
                <tr key={a.uid}>
                  <td style={{ color: '#9ca3af', width: 32 }}>{i + 1}</td>
                  <td style={{ fontWeight: i === 0 ? 700 : 400 }}>
                    {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{a.name}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{a.total}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: a.approved > 0 ? '#059669' : '#9ca3af' }}>
                    {a.approved > 0 ? a.approved : '—'}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: a.rejected > 0 ? '#dc2626' : '#9ca3af' }}>
                    {a.rejected > 0 ? a.rejected : '—'}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: a.pendingQc > 0 ? '#d97706' : '#9ca3af' }}>
                    {a.pendingQc > 0 ? a.pendingQc : '—'}
                  </td>
                  <td>
                    {a.rate !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: '#e0f0e6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${a.rate}%`, background: a.rate >= 80 ? '#10b981' : '#f59e0b', borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#6b7280', minWidth: 28, textAlign: 'right' }}>{a.rate}%</span>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>No reviews yet</span>
                    )}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: '#6b7280', fontSize: 12 }}>
                    {total > 0 ? `${Math.round((a.total / total) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Project distribution ── */}
      {projectDist.length > 0 && (
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">Project Distribution</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Total</th>
                <th>Approved</th>
                <th>Pending QC</th>
                <th style={{ width: 200 }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {projectDist.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}/analytics`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.total}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: p.approved > 0 ? '#059669' : '#9ca3af' }}>
                    {p.approved > 0 ? p.approved : '—'}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: p.pending > 0 ? '#d97706' : '#9ca3af' }}>
                    {p.pending > 0 ? p.pending : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: '#f0faf4', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(p.total / maxProject) * 100}%`, background: '#40916c', borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 28 }}>
                        {total > 0 ? `${Math.round((p.total / total) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
