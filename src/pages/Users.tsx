import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users';
import type { User, UserInput } from '../api/users';
import { useAuth } from '../context/AuthContext';

const ROLES = ['surveyor', 'supervisor', 'admin'];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin:      { bg: '#ede9fe', color: '#5b21b6' },
  supervisor: { bg: '#dbeafe', color: '#1e40af' },
  surveyor:   { bg: '#d1fae5', color: '#065f46' },
};

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const emptyForm = (): UserInput => ({ name: '', mobile: '', password: '', role: 'surveyor' });

export default function Users() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    getUsers()
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setEditing(null);
    setModal('create');
  };

  const openEdit = (u: User) => {
    setForm({ name: u.name, mobile: u.mobile, password: '', role: u.role });
    setFormError('');
    setEditing(u);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (modal === 'create' && !form.mobile.trim()) { setFormError('Mobile is required'); return; }
    if (modal === 'create' && !form.password?.trim()) { setFormError('Password is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (modal === 'create') {
        await createUser(form);
      } else if (editing) {
        const payload: Partial<UserInput> = { name: form.name, role: form.role };
        if (form.password?.trim()) payload.password = form.password;
        await updateUser(editing.id, payload);
      }
      setModal(null);
      fetchUsers();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (deleteConfirm !== u.id) { setDeleteConfirm(u.id); return; }
    setDeleteConfirm(null);
    try {
      await deleteUser(u.id);
      fetchUsers();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div>
      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 12, padding: 28,
            width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#1a3a2a' }}>
              {modal === 'create' ? '+ New User' : 'Edit User'}
            </h2>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13 }}>
                {formError}
              </div>
            )}

            <label style={labelStyle}>Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ravi Kumar"
              style={inputStyle}
              autoFocus
            />

            {modal === 'create' && (
              <>
                <label style={labelStyle}>Mobile Number *</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit mobile"
                  style={inputStyle}
                  type="tel"
                />
              </>
            )}

            <label style={labelStyle}>
              {modal === 'create' ? 'Password *' : 'New Password (leave blank to keep)'}
            </label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={modal === 'create' ? 'Set a password' : 'Leave blank to keep current'}
              style={inputStyle}
              type="password"
            />

            <label style={labelStyle}>Role *</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {ROLES.map((r) => {
                const rc = ROLE_COLORS[r] || { bg: '#f3f4f6', color: '#374151' };
                const active = form.role === r;
                return (
                  <button
                    key={r}
                    onClick={() => setForm({ ...form, role: r })}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                      border: active ? `2px solid ${rc.color}` : '2px solid #e5e7eb',
                      background: active ? rc.bg : '#fff',
                      color: active ? rc.color : '#6b7280',
                      fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
                {saving ? 'Saving…' : modal === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">{users.length} registered users</p>
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Field Agents & Team</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="search-bar"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isAdmin && (
              <button onClick={openCreate} style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: '#40916c', color: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                + New User
              </button>
            )}
          </div>
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
                <th>Mobile</th>
                <th>Role</th>
                <th>Joined</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rc = ROLE_COLORS[u.role] || { bg: '#f3f4f6', color: '#374151' };
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: rc.bg, color: rc.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {initials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {u.name}
                            {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>(you)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.mobile}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                        background: rc.bg, color: rc.color,
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#9ca3af' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(u)} title="Edit user" style={iconBtnStyle}>✏️</button>
                          {!isSelf && (
                            deleteConfirm === u.id
                              ? <>
                                  <button onClick={() => handleDelete(u)} title="Confirm delete" style={{ ...iconBtnStyle, color: '#dc2626', fontWeight: 700, fontSize: 11 }}>✓</button>
                                  <button onClick={() => setDeleteConfirm(null)} style={{ ...iconBtnStyle, fontSize: 11 }}>✗</button>
                                </>
                              : <button onClick={() => handleDelete(u)} title="Delete user" style={{ ...iconBtnStyle, color: '#dc2626' }}>🗑</button>
                          )}
                        </div>
                      </td>
                    )}
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

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4, marginTop: 14,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e0f0e6', fontSize: 14, boxSizing: 'border-box',
};
const saveBtnStyle: React.CSSProperties = {
  padding: '9px 20px', background: '#40916c', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '9px 16px', background: '#f3f4f6', color: '#374151',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
};
const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px',
};
