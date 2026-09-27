import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getProject } from '../api/projects';
import type { Project } from '../api/projects';

const STATUS_COLOR: Record<string, string> = {
  approved: '#059669',
  submitted: '#3b82f6',
  pending: '#f59e0b',
  finalized: '#8b5cf6',
  rejected: '#dc2626',
  draft: '#9ca3af',
};

export default function ProjectAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getProject(id), getSurveys({ project_id: id })])
      .then(([p, s]) => { setProject(p.data); setSurveys(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading analytics…</div>;
  if (!project) return <div style={{ padding: 40 }}>Project not found</div>;

  // Surveys per day — last 30 days
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
  const byDay: Record<string, number> = {};
  for (const d of days30) byDay[d] = 0;
  for (const s of surveys) {
    const day = s.created_at.slice(0, 10);
    if (byDay[day] !== undefined) byDay[day]++;
  }
  const dayCounts = days30.map((d) => byDay[d]);
  const maxDay = Math.max(...dayCounts, 1);

  // Status breakdown
  const byStatus: Record<string, number> = {};
  for (const s of surveys) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  const statusEntries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(...statusEntries.map(([, c]) => c), 1);

  // Agent leaderboard
  const agentMap: Record<string, { name: string; count: number; approved: number }> = {};
  for (const s of surveys) {
    const uid = s.user_id || 'unknown';
    if (!agentMap[uid]) agentMap[uid] = { name: s.assigned_to_name || uid.slice(0, 8), count: 0, approved: 0 };
    agentMap[uid].count++;
    if (s.status === 'approved') agentMap[uid].approved++;
  }
  const leaderboard = Object.entries(agentMap)
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const chartW = 600;
  const chartH = 120;
  const barW = Math.max(4, (chartW / 30) - 2);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/projects')} style={backBtnStyle}>←</button>
        <div>
          <h1 className="page-title" style={{ fontSize: 20 }}>Analytics — {project.name}</h1>
          <p className="page-subtitle">{surveys.length} total surveys</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{surveys.length}</div></div>
        {statusEntries.map(([s, c]) => (
          <div className="stat-card" key={s}>
            <div className="stat-label" style={{ textTransform: 'capitalize' }}>{s}</div>
            <div className="stat-value" style={{ color: STATUS_COLOR[s] }}>{c}</div>
          </div>
        ))}
      </div>

      {/* Surveys over time — SVG bar chart */}
      <div className="table-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 16, color: '#1a3a2a' }}>Surveys Over Time (last 30 days)</div>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${chartW} ${chartH + 24}`} style={{ width: '100%', minWidth: 320 }}>
            {dayCounts.map((count, i) => {
              const barH = count === 0 ? 2 : Math.max(4, (count / maxDay) * chartH);
              const x = i * (chartW / 30) + 1;
              const y = chartH - barH;
              return (
                <g key={i}>
                  <rect
                    x={x} y={y} width={barW} height={barH}
                    fill={count === 0 ? '#e0f0e6' : '#40916c'}
                    rx={2}
                  />
                  {count > 0 && (
                    <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="#374151">
                      {count}
                    </text>
                  )}
                </g>
              );
            })}
            {/* X-axis labels — every 5 days */}
            {days30.filter((_, i) => i % 5 === 0 || i === 29).map((d, i, arr) => {
              const origIdx = i === arr.length - 1 ? 29 : days30.indexOf(d);
              const x = origIdx * (chartW / 30) + barW / 2;
              return (
                <text key={d} x={x} y={chartH + 16} textAnchor="middle" fontSize={9} fill="#9ca3af">
                  {d.slice(5)}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Status breakdown */}
        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#1a3a2a' }}>Status Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusEntries.map(([status, count]) => (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', color: '#374151' }}>{status}</span>
                  <span style={{ fontWeight: 600, color: STATUS_COLOR[status] }}>{count}</span>
                </div>
                <div style={{ height: 8, background: '#f0faf4', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: STATUS_COLOR[status] || '#9ca3af',
                    width: `${(count / maxStatus) * 100}%`,
                    transition: 'width 0.4s',
                  }} />
                </div>
              </div>
            ))}
            {statusEntries.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>No surveys yet</div>}
          </div>
        </div>

        {/* Agent leaderboard */}
        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>Agent Leaderboard</div>
          {leaderboard.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No agents yet</div>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '0 0 8px' }}>#</th>
                  <th style={{ textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '0 0 8px' }}>Agent</th>
                  <th style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '0 0 8px' }}>Surveys</th>
                  <th style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', fontWeight: 600, padding: '0 0 8px' }}>Approved</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((a, i) => (
                  <tr key={a.uid}>
                    <td style={{ fontSize: 13, color: '#9ca3af', padding: '6px 0' }}>{i + 1}</td>
                    <td style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 400, padding: '6px 0' }}>
                      {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{a.name}
                    </td>
                    <td style={{ fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{a.count}</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>
                      {a.approved > 0
                        ? <span className="badge badge-synced" style={{ fontSize: 11 }}>{a.approved}</span>
                        : <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #e0f0e6', borderRadius: 8,
  padding: '6px 12px', cursor: 'pointer', fontSize: 18, color: '#1a3a2a',
};
