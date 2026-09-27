import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getUsers } from '../api/users';
import type { User } from '../api/users';
import { useAuth } from '../context/AuthContext';

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

  const totalSurveys = surveys.length;
  const submitted = surveys.filter((s) => s.status === 'submitted' || s.synced_at).length;
  const finalized = surveys.filter((s) => s.status === 'finalized').length;
  const draft = surveys.filter((s) => s.status === 'draft').length;
  const pendingQc = surveys.filter((s) => s.status === 'pending' || s.status === 'submitted').length;
  const approved = surveys.filter((s) => s.status === 'approved').length;
  const rejected = surveys.filter((s) => s.status === 'rejected').length;
  const reviewed = approved + rejected;
  const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null;

  // Agent leaderboard: surveys per user_id
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

          {/* Supervisor QC row */}
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
                  <div style={{
                    height: 6, background: '#e0f0e6', borderRadius: 99, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', background: '#40916c', borderRadius: 99,
                      width: `${approvalRate}%`, transition: 'width 0.5s',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{reviewed} reviewed</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Recent surveys */}
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

            {/* Agent leaderboard */}
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

function StatusBadge({ status, synced }: { status: string; synced: boolean }) {
  if (synced || status === 'approved') return <span className="badge badge-synced">Approved</span>;
  if (status === 'rejected') return <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Rejected</span>;
  if (status === 'finalized') return <span className="badge badge-finalized">Finalized</span>;
  return <span className="badge badge-draft">Draft</span>;
}
