import React, { useEffect, useState } from 'react';
import {
  getFieldMasters,
  createFieldMaster,
  updateFieldMaster,
  archiveFieldMaster,
} from '../api/field_masters';
import type { FieldMaster, FieldMasterInput } from '../api/field_masters';

const INPUT_TYPES = ['text', 'number', 'textarea', 'dropdown', 'image', 'location', 'date'] as const;
const DATA_TYPES = ['text', 'numeric', 'alphanumeric'] as const;
const IMAGE_SOURCES = ['camera', 'gallery', 'both'] as const;

const TYPE_LABELS: Record<string, string> = {
  text: 'Text', number: 'Number', textarea: 'Paragraph',
  dropdown: 'Dropdown', image: 'Image', location: 'Location', date: 'Date',
};

const emptyForm = (): FieldMasterInput => ({
  name: '', display_name: '', input_type: 'text', data_type: null,
  input_length: null, allow_special_chars: true, validation_regex: null,
  options: [], hint: null, image_source: 'both',
  is_required_default: false, dependent_on_id: null, dependent_value: [],
});

export default function FieldMasters() {
  const [masters, setMasters] = useState<FieldMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FieldMaster | null>(null);
  const [form, setForm] = useState<FieldMasterInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [depValText, setDepValText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFieldMasters();
      setMasters(data);
    } catch {
      setError('Failed to load field masters');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    const f = emptyForm();
    setForm(f);
    setOptionsText('');
    setDepValText('');
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (m: FieldMaster) => {
    setEditTarget(m);
    setForm({
      name: m.name, display_name: m.display_name, input_type: m.input_type,
      data_type: m.data_type, input_length: m.input_length,
      allow_special_chars: m.allow_special_chars, validation_regex: m.validation_regex,
      options: m.options, hint: m.hint, image_source: m.image_source,
      is_required_default: m.is_required_default, dependent_on_id: m.dependent_on_id,
      dependent_value: m.dependent_value,
    });
    setOptionsText(m.options.join('\n'));
    setDepValText(m.dependent_value.join('\n'));
    setSaveError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.display_name.trim()) {
      setSaveError('Name and Display Name are required');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        ...form,
        options: optionsText.split('\n').map(s => s.trim()).filter(Boolean),
        dependent_value: depValText.split('\n').map(s => s.trim()).filter(Boolean),
        name: form.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      };
      if (editTarget) {
        await updateFieldMaster(editTarget.id, payload);
      } else {
        await createFieldMaster(payload);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Archive this field master? Forms using it will gracefully skip the field.')) return;
    try { await archiveFieldMaster(id); load(); } catch { alert('Failed to archive'); }
  };

  const handleRestore = async (id: string) => {
    try { await updateFieldMaster(id, { status: 'active' }); load(); } catch { alert('Failed to restore'); }
  };

  const filtered = masters.filter(m => {
    if (!showArchived && m.status === 'archived') return false;
    const q = searchTerm.toLowerCase();
    return !q || m.name.includes(q) || m.display_name.toLowerCase().includes(q);
  });

  const activeMasters = masters.filter(m => m.status === 'active');

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Field Masters</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Reusable field definitions with validation rules. Reference them in form builders.
          </p>
        </div>
        <button onClick={openCreate} style={btnStyle('green')}>+ New Field Master</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 14, width: 240 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 13 }}>
          {activeMasters.length} active · {masters.length - activeMasters.length} archived
        </span>
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Loading…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Name', 'Display Name', 'Input Type', 'Data Type', 'Length', 'Regex', 'Required', 'Dependent On', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 24, color: '#9ca3af', textAlign: 'center' }}>No field masters found</td></tr>
              )}
              {filtered.map(m => {
                const dep = m.dependent_on_id ? activeMasters.find(x => x.id === m.dependent_on_id) : null;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: m.status === 'archived' ? 0.55 : 1 }}>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#059669' }}>{m.name}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 500 }}>{m.display_name}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={typePill(m.input_type)}>{TYPE_LABELS[m.input_type]}</span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{m.data_type || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{m.input_length ?? '—'}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#7c3aed', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.validation_regex || '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      {m.is_required_default ? <span style={{ color: '#dc2626', fontWeight: 600 }}>Yes</span> : <span style={{ color: '#9ca3af' }}>No</span>}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#6b7280', fontSize: 12 }}>
                      {dep ? dep.name : (m.dependent_on_id ? <span style={{ color: '#ef4444' }}>missing</span> : '—')}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.status === 'active' ? '#d1fae5' : '#f3f4f6', color: m.status === 'active' ? '#065f46' : '#9ca3af' }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(m)} style={btnSmall('blue')}>Edit</button>
                      {m.status === 'active'
                        ? <button onClick={() => handleArchive(m.id)} style={btnSmall('red')}>Archive</button>
                        : <button onClick={() => handleRestore(m.id)} style={btnSmall('gray')}>Restore</button>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
              {editTarget ? `Edit: ${editTarget.display_name}` : 'New Field Master'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Display Name *">
                <input style={inputStyle} value={form.display_name} onChange={e => {
                  const v = e.target.value;
                  setForm(f => ({
                    ...f, display_name: v,
                    name: editTarget ? f.name : v.toLowerCase().replace(/[^a-z0-9_\s]/gi, '').trim().replace(/\s+/g, '_'),
                  }));
                }} />
              </Field>
              <Field label="Name (snake_case) *">
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Input Type *">
                <select style={inputStyle} value={form.input_type} onChange={e => setForm(f => ({ ...f, input_type: e.target.value as any }))}>
                  {INPUT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </Field>
              <Field label="Data Type">
                <select style={inputStyle} value={form.data_type ?? ''} onChange={e => setForm(f => ({ ...f, data_type: e.target.value as any || null }))}>
                  <option value="">— None —</option>
                  {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Max Input Length">
                <input type="number" style={inputStyle} value={form.input_length ?? ''} onChange={e => setForm(f => ({ ...f, input_length: e.target.value ? +e.target.value : null }))} placeholder="Unlimited" />
              </Field>
              <Field label="Image Source">
                <select style={inputStyle} value={form.image_source} onChange={e => setForm(f => ({ ...f, image_source: e.target.value as any }))}>
                  {IMAGE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Validation Regex" fullWidth>
                <input style={inputStyle} value={form.validation_regex ?? ''} onChange={e => setForm(f => ({ ...f, validation_regex: e.target.value || null }))} placeholder="e.g. ^[6-9][0-9]{9}$" />
              </Field>
              <Field label="Hint / Helper text" fullWidth>
                <input style={inputStyle} value={form.hint ?? ''} onChange={e => setForm(f => ({ ...f, hint: e.target.value || null }))} />
              </Field>
              {form.input_type === 'dropdown' && (
                <Field label="Options (one per line)" fullWidth>
                  <textarea style={{ ...inputStyle, height: 80 }} value={optionsText} onChange={e => setOptionsText(e.target.value)} placeholder="Wheat&#10;Rice&#10;Maize" />
                </Field>
              )}
              <Field label="Dependent On (field master)">
                <select style={inputStyle} value={form.dependent_on_id ?? ''} onChange={e => setForm(f => ({ ...f, dependent_on_id: e.target.value || null }))}>
                  <option value="">— None —</option>
                  {activeMasters.filter(m => !editTarget || m.id !== editTarget.id).map(m => (
                    <option key={m.id} value={m.id}>{m.display_name}</option>
                  ))}
                </select>
              </Field>
              {form.dependent_on_id && (
                <Field label="Show when parent equals (one per line)">
                  <textarea style={{ ...inputStyle, height: 64 }} value={depValText} onChange={e => setDepValText(e.target.value)} placeholder="Mild&#10;Moderate&#10;Severe" />
                </Field>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_required_default} onChange={e => setForm(f => ({ ...f, is_required_default: e.target.checked }))} />
                Required by default
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.allow_special_chars} onChange={e => setForm(f => ({ ...f, allow_special_chars: e.target.checked }))} />
                Allow special chars
              </label>
            </div>

            {saveError && <p style={{ color: '#ef4444', marginTop: 12, fontSize: 13 }}>{saveError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={btnStyle('gray')}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={btnStyle('green')}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 7,
  border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box',
};

function btnStyle(color: 'green' | 'gray' | 'red'): React.CSSProperties {
  const bg = color === 'green' ? '#059669' : color === 'red' ? '#dc2626' : '#6b7280';
  return { padding: '8px 18px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
}

function btnSmall(color: 'blue' | 'red' | 'gray'): React.CSSProperties {
  const bg = color === 'blue' ? '#2563eb' : color === 'red' ? '#dc2626' : '#6b7280';
  return { padding: '4px 10px', borderRadius: 6, border: 'none', background: bg, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' };
}

function typePill(type: string): React.CSSProperties {
  const colors: Record<string, [string, string]> = {
    text: ['#dbeafe', '#1d4ed8'], number: ['#ede9fe', '#5b21b6'], textarea: ['#fce7f3', '#be185d'],
    dropdown: ['#dcfce7', '#15803d'], image: ['#ffedd5', '#c2410c'], location: ['#cffafe', '#0e7490'], date: ['#fef9c3', '#a16207'],
  };
  const [bg, fg] = colors[type] || ['#f3f4f6', '#374151'];
  return { padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: fg, whiteSpace: 'nowrap' };
}
