import { useEffect, useState } from 'react';
import { getUsers } from '../api/users';
import type { User } from '../api/users';

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#ede9fe', color: '#5b21b6' },
  supervisor: { bg: '#dbeafe', color: '#1e40af' },
  field_agent: { bg: '#d1fae5', color: '#065f46' },
  viewer: { bg: '#f3f4f6', color: '#374151' },
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getUsers()
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">{users.length} registered users</p>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Field Agents & Team</span>
          <input
            className="search-bar"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No users found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Mobile</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rc = ROLE_COLORS[u.role] || ROLE_COLORS.viewer;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: '#d1fae5', color: '#065f46',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {initials(u.name)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#6b7280', fontSize: 13 }}>{u.username || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: rc.bg,
                        color: rc.color,
                        textTransform: 'capitalize',
                      }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{u.mobile || <span style={{ color: '#9ca3af' }}>—</span>}</td>
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
