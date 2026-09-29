import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getUsers } from '../api/users';
import type { User } from '../api/users';
import { useAuth } from '../context/AuthContext';

// Donut constants
const DR = 40, DCX = 60, DCY = 60;
const CIRC = 2 * Math.PI * DR; // ≈ 251.3

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  // ── Summary stats ──────────────────────────────────────────────
  const totalSurveys = surveys.length;
  const finalized = surveys.filter((s) => s.status === 'finalized').length;
  const submitted = surveys.filter((s) => s.status === 'submitted' || s.synced_at).length;
  const draft = surveys.filter((s) => s.status === 'draft').length;
  const pendingQc = surveys.filter((s) => s.status === 'pending' || s.status === 'submitted').length;
  const approved = surveys.filter((s) => s.status === 'approved').length;
  const rejected = surveys.filter((s) => s.status === 'rejected').length;
  const reviewed = approved + rejected;
  const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null;

  // ── 14-day trend ───────────────────────────────────────────────
  const today = new Date();
  const days14: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days14.push(d.toISOString().slice(0, 10));
  }
  const surveysPerDay: Record<string, number> = {};
  for (const d of days14) surveysPerDay[d] = 0;
  for (const s of surveys) {
    const d = s.created_at?.slice(0, 10);
    if (d && surveysPerDay[d] !== undefined) surveysPerDay[d]++;
  }
  const maxDayCount = Math.max(1, ...Object.values(surveysPerDay));
  const thisWeek = days14.slice(7).reduce((sum, d) => sum + (surveysPerDay[d] || 0), 0);
  const lastWeek = days14.slice(0, 7).reduce((sum, d) => sum + (surveysPerDay[d] || 0), 0);
  const weekChangePct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  // ── Status donut ───────────────────────────────────────────────
  const statusGroups = [
    { label: 'Draft',      color: '#9ca3af', count: draft },
    { label: 'Finalized',  color: '#6366f1', count: finalized },
    { label: 'Submitted',  color: '#f59e0b', count: pendingQc },
    { label: 'Approved',   color: '#10b981', count: approved },
    { label: 'Rejected',   color: '#ef4444', count: rejected },
  ].filter((g) => g.count > 0);
  const totalForDonut = statusGroups.reduce((s, g) => s + g.count, 0) || 1;
  let accDash = 0;
  const donutSegs = statusGroups.map((g) => {
    const dash = (g.count / totalForDonut) * CIRC;
    // dashoffset = CIRC - accDash shifts the segment start to the correct arc position
    const offset = accDash === 0 ? 0 : CIRC - accDash;
    accDash += dash;
    return { ...g, dash, offset, gap: CIRC - dash };
  });

  // ── Project pipeline ───────────────────────────────────────────
  const pMap: Record<string, { total: number; pendingN: number; approvedN: number; rejectedN: number }> = {};
  for (const s of surveys) {
    if (!pMap[s.project_id]) pMap[s.project_id] = { total: 0, pendingN: 0, approvedN: 0, rejectedN: 0 };
    pMap[s.project_id].total++;
    if (s.status === 'submitted' || s.status === 'pending') pMap[s.project_id].pendingN++;
    if (s.status === 'approved') pMap[s.project_id].approvedN++;
    if (s.status === 'rejected') pMap[s.project_id].rejectedN++;
  }
  const pipeline = projects
    .map((p) => ({ ...p, ...(pMap[p.id] ?? { total: 0, pendingN: 0, approvedN: 0, rejectedN: 0 }) }))
    .sort((a, b) => b.total - a.total);

  // ── Agent leaderboard ──────────────────────────────────────────
  const agentMap: Record<string, { name: string; count: number; approved: number }> = {};
  for (const s of surveys) {
    const uid = s.user_id;
    if (!uid) continue;
    if (!agentMap[uid]) {
      const u = users.find((u) => u.id === uid);
      agentMap[uid] = { name: u?.name || uid.slice(0, 8), count: 0, approved: 0 };
    }
    agentMap[uid].count++;
    if (s.status === 'approved') agentMap[uid].approved++;
  }
  const leaderboard = Object.entries(agentMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const recent = [...surveys]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's happening across your field surveys</p>
      </div>

      {loading ? (
        <div className="loading">Loading dashboard…</div>
      ) : (
        <>
          {/* ── Top stat grid ── */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Surveys</div>
              <div className="stat-value">{totalSurveys}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Finalized</div>
              <div className="stat-value">{finalized}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Submitted</div>
              <div className="stat-value">{submitted}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Drafts</div>
              <div className="stat-value">{draft}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Projects</div>
              <div className="stat-value">{projects.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Field Agents</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>

          {/* ── QC row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div
              className="stat-card"
              onClick={() => navigate('/surveys?status=pending')}
              style={{ cursor: 'pointer', border: pendingQc > 0 ? '2px solid #f59e0b' : undefined }}
            >
              <div className="stat-label">Pending QC Review</div>
              <div className="stat-value" style={{ color: pendingQc > 0 ? '#d97706' : undefined }}>{pendingQc}</div>
              {pendingQc > 0 && <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>Needs attention</div>}
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
              <div className="stat-label">Approval Rate</div>
              <div className="stat-value" style={{ color: '#40916c' }}>
                {approvalRate !== null ? `${approvalRate}%` : '—'}
              </div>
              {reviewed > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 6, background: '#e0f0e6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#40916c', borderRadius: 99, width: `${approvalRate}%`, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{reviewed} reviewed</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Analytics row: Activity + Donut ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* 14-day activity bar chart */}
            <div className="table-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="table-title">14-Day Activity</span>
                {weekChangePct !== null && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: weekChangePct >= 0 ? '#059669' : '#dc2626' }}>
                    {weekChangePct >= 0 ? '▲' : '▼'} {Math.abs(weekChangePct)}% vs last week
                  </span>
                )}
              </div>
              <ActivityChart days={days14} surveysPerDay={surveysPerDay} maxCount={maxDayCount} />
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                <span>This week: <strong style={{ color: '#1a3a2a' }}>{thisWeek}</strong></span>
                <span>Last week: <strong style={{ color: '#1a3a2a' }}>{lastWeek}</strong></span>
              </div>
            </div>

            {/* Status donut */}
            <div className="table-card" style={{ padding: '16px 20px' }}>
              <span className="table-title" style={{ display: 'block', marginBottom: 12 }}>Status Breakdown</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <svg viewBox="0 0 120 120" style={{ width: 110, height: 110, flexShrink: 0 }}>
                  {/* Background ring */}
                  <circle cx={DCX} cy={DCY} r={DR} fill="none" stroke="#f3f4f6" strokeWidth={20} />
                  {/* Segments — group rotated -90° so first segment starts at 12 o'clock */}
                  <g transform={`rotate(-90 ${DCX} ${DCY})`}>
                    {donutSegs.map((seg) => (
                      <circle
                        key={seg.label}
                        cx={DCX} cy={DCY} r={DR}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={20}
                        strokeDasharray={`${seg.dash.toFixed(2)} ${seg.gap.toFixed(2)}`}
                        strokeDashoffset={seg.offset.toFixed(2)}
                      />
                    ))}
                  </g>
                  {/* Centre label */}
                  <text x={DCX} y={DCY - 5} textAnchor="middle" fontSize={20} fontWeight={700} fill="#1a3a2a">{totalSurveys}</text>
                  <text x={DCX} y={DCY + 11} textAnchor="middle" fontSize={9} fill="#6b7280">surveys</text>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {statusGroups.map((g) => (
                    <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                      <span style={{ color: '#6b7280', minWidth: 62 }}>{g.label}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{g.count}</span>
                      <span style={{ color: '#d1d5db', fontSize: 10 }}>
                        {Math.round((g.count / totalSurveys) * 100)}%
                      </span>
                    </div>
                  ))}
                  {statusGroups.length === 0 && <span style={{ color: '#9ca3af', fontSize: 13 }}>No surveys yet</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Project Pipeline ── */}
          {pipeline.length > 0 && (
            <div className="table-card" style={{ marginBottom: 16 }}>
              <div className="table-header">
                <span className="table-title">Project Pipeline</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th style={{ width: 64 }}>Total</th>
                    <th style={{ width: 64 }}>Pending</th>
                    <th style={{ width: 64 }}>Approved</th>
                    <th style={{ width: 180 }}>Approval Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {pipeline.map((p) => {
                    const rate = p.total > 0 ? Math.round((p.approvedN / p.total) * 100) : 0;
                    const barColor = rate >= 80 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#40916c';
                    return (
                      <tr key={p.id} onClick={() => navigate(`/projects/${p.id}/analytics`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                            fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                            background: p.status === 'active' ? '#d1fae5' : '#f3f4f6',
                            color: p.status === 'active' ? '#065f46' : '#6b7280',
                          }}>{p.status}</span>
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.total}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: p.pendingN > 0 ? '#d97706' : '#9ca3af' }}>
                          {p.pendingN > 0 ? p.pendingN : '—'}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: p.approvedN > 0 ? '#059669' : '#9ca3af' }}>
                          {p.approvedN > 0 ? p.approvedN : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#e0f0e6', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${rate}%`,
                                background: barColor, borderRadius: 99, transition: 'width 0.5s',
                              }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#6b7280', minWidth: 30, textAlign: 'right' }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Bottom row: Recent surveys + Agent leaderboard ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div className="table-card">
              <div className="table-header">
                <span className="table-title">Recent Surveys</span>
              </div>
              {recent.length === 0 ? (
                <div className="empty">No surveys yet</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Survey ID</th>
                      <th>Project</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Assigned</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((s) => (
                      <tr key={s.id} onClick={() => navigate(`/surveys/${s.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.id.slice(0, 8)}…</td>
                        <td>{s.project_id.slice(0, 8)}…</td>
                        <td>{s.geometry_type}</td>
                        <td><StatusBadge status={s.status} synced={!!s.synced_at} /></td>
                        <td>{s.assigned_to_name || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                        <td>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {leaderboard.length > 0 && (
              <div className="table-card">
                <div className="table-header">
                  <span className="table-title">Agent Leaderboard</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Agent</th>
                      <th>Surveys</th>
                      <th>Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((agent, i) => (
                      <tr key={agent.id}>
                        <td style={{ color: '#9ca3af', width: 32 }}>{i + 1}</td>
                        <td style={{ fontWeight: i === 0 ? 700 : 400 }}>
                          {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{agent.name}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{agent.count}</td>
                        <td>
                          {agent.approved > 0
                            ? <span className="badge badge-synced">{agent.approved}</span>
                            : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Activity bar chart ─────────────────────────────────────────────────────────

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ActivityChart({
  days,
  surveysPerDay,
  maxCount,
}: {
  days: string[];
  surveysPerDay: Record<string, number>;
  maxCount: number;
}) {
  const BAR_W = 22, GAP = 8, CHART_H = 80, LABEL_H = 20;
  const totalW = days.length * (BAR_W + GAP) - GAP;

  return (
    <svg viewBox={`0 0 ${totalW} ${CHART_H + LABEL_H}`} style={{ width: '100%', height: 110 }}>
      {days.map((d, i) => {
        const count = surveysPerDay[d] ?? 0;
        const barH = count === 0 ? 2 : Math.max(6, (count / maxCount) * CHART_H);
        const x = i * (BAR_W + GAP);
        const isToday = i === days.length - 1;
        const month = parseInt(d.slice(5, 7));
        const day = d.slice(8);
        // Show month label on 1st of month, otherwise day number
        const label = day === '01' ? MONTH_LABELS[month] : day;

        return (
          <g key={d}>
            <rect
              x={x} y={CHART_H - barH} width={BAR_W} height={barH}
              rx={4}
              fill={isToday ? '#2d6a4f' : count > 0 ? '#52b788' : '#e9f5ee'}
            />
            {count > 0 && (
              <text x={x + BAR_W / 2} y={CHART_H - barH - 3} textAnchor="middle" fontSize={8} fill="#374151">
                {count}
              </text>
            )}
            <text
              x={x + BAR_W / 2} y={CHART_H + 15}
              textAnchor="middle" fontSize={day === '01' ? 8 : 9}
              fontWeight={day === '01' ? 600 : 400}
              fill={isToday ? '#2d6a4f' : '#9ca3af'}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, synced }: { status: string; synced: boolean }) {
  if (synced || status === 'approved') return <span className="badge badge-synced">Approved</span>;
  if (status === 'rejected') return <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Rejected</span>;
  if (status === 'finalized') return <span className="badge badge-finalized">Finalized</span>;
  return <span className="badge badge-draft">Draft</span>;
}
