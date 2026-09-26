import { useEffect, useState } from 'react';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';
import { getUsers } from '../api/users';
import type { User } from '../api/users';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
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
                    <tr key={s.id}>
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
        </>
      )}
    </div>
  );
}

function StatusBadge({ status, synced }: { status: string; synced: boolean }) {
  if (synced) return <span className="badge badge-synced">Synced</span>;
  if (status === 'finalized') return <span className="badge badge-finalized">Finalized</span>;
  return <span className="badge badge-draft">Draft</span>;
}
