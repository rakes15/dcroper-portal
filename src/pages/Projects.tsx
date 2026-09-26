import { useEffect, useState } from 'react';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProjects()
      .then((r) => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">{projects.length} active projects</p>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">All Projects</span>
          <input
            className="search-bar"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No projects found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Geometry</th>
                <th>Surveys</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                let config: any = {};
                try { config = JSON.parse(p.config); } catch {}
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.description || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        {config.geometry_type === 'polygon' ? '⬡' : '📍'} {config.geometry_type || '—'}
                      </span>
                    </td>
                    <td>{p.survey_count ?? '—'}</td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
