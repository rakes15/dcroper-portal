import { useEffect, useState } from 'react';
import {
  getStates, createState, updateState, deleteState,
  getDistricts, createDistrict, updateDistrict, deleteDistrict,
  getSeasons, createSeason, updateSeason, deleteSeason,
  getCrops, createCrop, updateCrop, deleteCrop,
} from '../api/masters';
import type { MasterState, MasterDistrict, MasterSeason, MasterCrop } from '../api/masters';
import { useAuth } from '../context/AuthContext';

type Tab = 'states' | 'districts' | 'seasons' | 'crops';

export default function Masters() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<Tab>('states');

  // States
  const [states, setStates] = useState<MasterState[]>([]);
  const [stateForm, setStateForm] = useState({ name: '', code: '' });
  const [editingState, setEditingState] = useState<MasterState | null>(null);
  const [stateError, setStateError] = useState('');

  // Districts
  const [districts, setDistricts] = useState<MasterDistrict[]>([]);
  const [districtForm, setDistrictForm] = useState({ name: '', state_id: '', code: '' });
  const [editingDistrict, setEditingDistrict] = useState<MasterDistrict | null>(null);
  const [districtError, setDistrictError] = useState('');

  // Seasons
  const [seasons, setSeasons] = useState<MasterSeason[]>([]);
  const [seasonForm, setSeasonForm] = useState({ name: '' });
  const [editingSeason, setEditingSeason] = useState<MasterSeason | null>(null);
  const [seasonError, setSeasonError] = useState('');

  // Crops
  const [crops, setCrops] = useState<MasterCrop[]>([]);
  const [cropForm, setCropForm] = useState({ name: '', category: '' });
  const [editingCrop, setEditingCrop] = useState<MasterCrop | null>(null);
  const [cropError, setCropError] = useState('');

  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sr, dr, sea, cr] = await Promise.all([
        getStates(), getDistricts(), getSeasons(), getCrops(),
      ]);
      setStates(sr.data);
      setDistricts(dr.data);
      setSeasons(sea.data);
      setCrops(cr.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── States ────────────────────────────────────────────────────────────────
  const handleStateSave = async () => {
    if (!stateForm.name.trim()) { setStateError('Name is required'); return; }
    setStateError('');
    try {
      if (editingState) {
        await updateState(editingState.id, { name: stateForm.name, code: stateForm.code || undefined });
      } else {
        await createState({ name: stateForm.name, code: stateForm.code || undefined });
      }
      setStateForm({ name: '', code: '' });
      setEditingState(null);
      const r = await getStates();
      setStates(r.data);
    } catch (e: any) { setStateError(e.response?.data?.error || 'Save failed'); }
  };

  const handleStateEdit = (s: MasterState) => {
    setEditingState(s);
    setStateForm({ name: s.name, code: s.code || '' });
    setStateError('');
  };

  const handleStateDelete = async (id: string) => {
    if (!confirm('Delete this state? All its districts will also be removed.')) return;
    try {
      await deleteState(id);
      setStates((prev) => prev.filter((s) => s.id !== id));
      setDistricts((prev) => prev.filter((d) => d.state_id !== id));
    } catch (e: any) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  // ── Districts ─────────────────────────────────────────────────────────────
  const handleDistrictSave = async () => {
    if (!districtForm.name.trim()) { setDistrictError('Name is required'); return; }
    if (!districtForm.state_id) { setDistrictError('State is required'); return; }
    setDistrictError('');
    try {
      if (editingDistrict) {
        await updateDistrict(editingDistrict.id, {
          name: districtForm.name, state_id: districtForm.state_id, code: districtForm.code || undefined,
        });
      } else {
        await createDistrict({
          name: districtForm.name, state_id: districtForm.state_id, code: districtForm.code || undefined,
        });
      }
      setDistrictForm({ name: '', state_id: '', code: '' });
      setEditingDistrict(null);
      const r = await getDistricts();
      setDistricts(r.data);
    } catch (e: any) { setDistrictError(e.response?.data?.error || 'Save failed'); }
  };

  const handleDistrictEdit = (d: MasterDistrict) => {
    setEditingDistrict(d);
    setDistrictForm({ name: d.name, state_id: d.state_id, code: d.code || '' });
    setDistrictError('');
  };

  const handleDistrictDelete = async (id: string) => {
    if (!confirm('Delete this district?')) return;
    try {
      await deleteDistrict(id);
      setDistricts((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  // ── Seasons ───────────────────────────────────────────────────────────────
  const handleSeasonSave = async () => {
    if (!seasonForm.name.trim()) { setSeasonError('Name is required'); return; }
    setSeasonError('');
    try {
      if (editingSeason) {
        await updateSeason(editingSeason.id, { name: seasonForm.name });
      } else {
        await createSeason({ name: seasonForm.name });
      }
      setSeasonForm({ name: '' });
      setEditingSeason(null);
      const r = await getSeasons();
      setSeasons(r.data);
    } catch (e: any) { setSeasonError(e.response?.data?.error || 'Save failed'); }
  };

  const handleSeasonEdit = (s: MasterSeason) => {
    setEditingSeason(s);
    setSeasonForm({ name: s.name });
    setSeasonError('');
  };

  const handleSeasonDelete = async (id: string) => {
    if (!confirm('Delete this season?')) return;
    try {
      await deleteSeason(id);
      setSeasons((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  // ── Crops ─────────────────────────────────────────────────────────────────
  const handleCropSave = async () => {
    if (!cropForm.name.trim()) { setCropError('Name is required'); return; }
    setCropError('');
    try {
      if (editingCrop) {
        await updateCrop(editingCrop.id, { name: cropForm.name, category: cropForm.category || undefined });
      } else {
        await createCrop({ name: cropForm.name, category: cropForm.category || undefined });
      }
      setCropForm({ name: '', category: '' });
      setEditingCrop(null);
      const r = await getCrops();
      setCrops(r.data);
    } catch (e: any) { setCropError(e.response?.data?.error || 'Save failed'); }
  };

  const handleCropEdit = (c: MasterCrop) => {
    setEditingCrop(c);
    setCropForm({ name: c.name, category: c.category || '' });
    setCropError('');
  };

  const handleCropDelete = async (id: string) => {
    if (!confirm('Delete this crop?')) return;
    try {
      await deleteCrop(id);
      setCrops((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'states', label: 'States', icon: '🏛', count: states.length },
    { key: 'districts', label: 'Districts', icon: '📍', count: districts.length },
    { key: 'seasons', label: 'Seasons', icon: '🌱', count: seasons.length },
    { key: 'crops', label: 'Crops', icon: '🌾', count: crops.length },
  ];

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #d1fae5',
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const btnPrimary: React.CSSProperties = {
    padding: '8px 20px', borderRadius: 8, border: 'none',
    background: '#40916c', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
  };
  const btnSecondary: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db',
    background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 14,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Masters</h1>
        <p className="page-subtitle">Manage reference data for states, districts, seasons, and crops</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: tab === t.key ? 'none' : '1px solid #e0f0e6',
              background: tab === t.key ? '#40916c' : '#fff',
              color: tab === t.key ? '#fff' : '#374151',
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.icon} {t.label}
            <span style={{
              background: tab === t.key ? 'rgba(255,255,255,0.3)' : '#e0f0e6',
              color: tab === t.key ? '#fff' : '#1a3a2a',
              borderRadius: 20, padding: '1px 8px', fontSize: 12, fontWeight: 700,
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading masters…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>

          {/* ── Add / Edit Form ── */}
          <div className="table-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a3a2a', fontSize: 16, fontWeight: 700 }}>
              {tab === 'states' && (editingState ? 'Edit State' : 'Add State')}
              {tab === 'districts' && (editingDistrict ? 'Edit District' : 'Add District')}
              {tab === 'seasons' && (editingSeason ? 'Edit Season' : 'Add Season')}
              {tab === 'crops' && (editingCrop ? 'Edit Crop' : 'Add Crop')}
            </h3>

            {tab === 'states' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={inputStyle} placeholder="State name *" value={stateForm.name}
                  onChange={(e) => setStateForm((f) => ({ ...f, name: e.target.value }))} />
                <input style={inputStyle} placeholder="Code (e.g. MH)" value={stateForm.code}
                  onChange={(e) => setStateForm((f) => ({ ...f, code: e.target.value }))} />
                {stateError && <div style={{ color: '#dc2626', fontSize: 13 }}>{stateError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  {isAdmin && <button style={btnPrimary} onClick={handleStateSave}>
                    {editingState ? 'Update' : 'Add State'}
                  </button>}
                  {editingState && (
                    <button style={btnSecondary} onClick={() => { setEditingState(null); setStateForm({ name: '', code: '' }); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === 'districts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={inputStyle} placeholder="District name *" value={districtForm.name}
                  onChange={(e) => setDistrictForm((f) => ({ ...f, name: e.target.value }))} />
                <select style={inputStyle} value={districtForm.state_id}
                  onChange={(e) => setDistrictForm((f) => ({ ...f, state_id: e.target.value }))}>
                  <option value="">Select State *</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input style={inputStyle} placeholder="Code (e.g. PNE)" value={districtForm.code}
                  onChange={(e) => setDistrictForm((f) => ({ ...f, code: e.target.value }))} />
                {districtError && <div style={{ color: '#dc2626', fontSize: 13 }}>{districtError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  {isAdmin && <button style={btnPrimary} onClick={handleDistrictSave}>
                    {editingDistrict ? 'Update' : 'Add District'}
                  </button>}
                  {editingDistrict && (
                    <button style={btnSecondary} onClick={() => { setEditingDistrict(null); setDistrictForm({ name: '', state_id: '', code: '' }); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === 'seasons' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={inputStyle} placeholder="Season name *" value={seasonForm.name}
                  onChange={(e) => setSeasonForm({ name: e.target.value })} />
                {seasonError && <div style={{ color: '#dc2626', fontSize: 13 }}>{seasonError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  {isAdmin && <button style={btnPrimary} onClick={handleSeasonSave}>
                    {editingSeason ? 'Update' : 'Add Season'}
                  </button>}
                  {editingSeason && (
                    <button style={btnSecondary} onClick={() => { setEditingSeason(null); setSeasonForm({ name: '' }); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === 'crops' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={inputStyle} placeholder="Crop name *" value={cropForm.name}
                  onChange={(e) => setCropForm((f) => ({ ...f, name: e.target.value }))} />
                <input style={inputStyle} placeholder="Category (e.g. Cereal, Oilseed)" value={cropForm.category}
                  onChange={(e) => setCropForm((f) => ({ ...f, category: e.target.value }))} />
                {cropError && <div style={{ color: '#dc2626', fontSize: 13 }}>{cropError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  {isAdmin && <button style={btnPrimary} onClick={handleCropSave}>
                    {editingCrop ? 'Update' : 'Add Crop'}
                  </button>}
                  {editingCrop && (
                    <button style={btnSecondary} onClick={() => { setEditingCrop(null); setCropForm({ name: '', category: '' }); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── List ── */}
          <div className="table-card">
            {tab === 'states' && (
              <>
                <div className="table-header">
                  <span className="table-title">States ({states.length})</span>
                </div>
                <table>
                  <thead><tr><th>Name</th><th>Code</th>{isAdmin && <th></th>}</tr></thead>
                  <tbody>
                    {states.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af' }}>No states yet</td></tr>
                    ) : states.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td><span style={{ background: '#e0f0e6', color: '#1a3a2a', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{s.code || '—'}</span></td>
                        {isAdmin && (
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleStateEdit(s)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                            <button onClick={() => handleStateDelete(s.id)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>Del</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'districts' && (
              <>
                <div className="table-header">
                  <span className="table-title">Districts ({districts.length})</span>
                </div>
                <table>
                  <thead><tr><th>Name</th><th>State</th><th>Code</th>{isAdmin && <th></th>}</tr></thead>
                  <tbody>
                    {districts.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>No districts yet</td></tr>
                    ) : districts.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td style={{ color: '#6b7280', fontSize: 13 }}>{d.state_name || states.find((s) => s.id === d.state_id)?.name || '—'}</td>
                        <td><span style={{ background: '#e0f0e6', color: '#1a3a2a', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{d.code || '—'}</span></td>
                        {isAdmin && (
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleDistrictEdit(d)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                            <button onClick={() => handleDistrictDelete(d.id)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>Del</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'seasons' && (
              <>
                <div className="table-header">
                  <span className="table-title">Seasons ({seasons.length})</span>
                </div>
                <table>
                  <thead><tr><th>Name</th>{isAdmin && <th></th>}</tr></thead>
                  <tbody>
                    {seasons.length === 0 ? (
                      <tr><td colSpan={2} style={{ textAlign: 'center', color: '#9ca3af' }}>No seasons yet</td></tr>
                    ) : seasons.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        {isAdmin && (
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleSeasonEdit(s)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                            <button onClick={() => handleSeasonDelete(s.id)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>Del</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'crops' && (
              <>
                <div className="table-header">
                  <span className="table-title">Crops ({crops.length})</span>
                </div>
                <table>
                  <thead><tr><th>Name</th><th>Category</th>{isAdmin && <th></th>}</tr></thead>
                  <tbody>
                    {crops.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af' }}>No crops yet</td></tr>
                    ) : crops.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ color: '#6b7280', fontSize: 13 }}>{c.category || '—'}</td>
                        {isAdmin && (
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleCropEdit(c)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                            <button onClick={() => handleCropDelete(c.id)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>Del</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
