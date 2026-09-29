import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSettings, updateSettings } from '../api/settings';
import type { AppSettings } from '../api/settings';

type Tab = 'org' | 'workflow' | 'sync' | 'notifications';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'org', label: 'Organization', icon: '🏢' },
  { id: 'workflow', label: 'Survey Workflow', icon: '📋' },
  { id: 'sync', label: 'Sync & Offline', icon: '🔄' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
];

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'UTC',
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? '#10b981' : '#d1d5db', position: 'relative', transition: 'background 0.2s',
        flexShrink: 0, opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<Tab>('org');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [draft, setDraft] = useState<Partial<AppSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings()
      .then((r) => { setSettings(r.data); setDraft(r.data); })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof AppSettings, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggle = (key: keyof AppSettings) =>
    set(key, draft[key] === 'true' ? 'false' : 'true');

  const on = (key: keyof AppSettings) => draft[key] === 'true';

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await updateSettings(draft);
      setSettings(res.data);
      setDraft(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  if (loading) return (
    <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading settings…</div>
  );

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          Admin Settings
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Configure app behaviour, workflow rules, and integrations.
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
          borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem',
        }}>{error}</div>
      )}

      {!isAdmin && (
        <div style={{
          background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a',
          borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem',
        }}>
          ⚠️ You have read-only access. Only admins can modify settings.
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Tab sidebar */}
        <div style={{
          width: 200, flexShrink: 0, background: 'var(--card-bg)',
          border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
        }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '0.75rem 1rem',
                background: tab === t.id ? 'var(--primary)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: '0.5rem', fontSize: '0.875rem', fontWeight: tab === t.id ? 600 : 400,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem' }}>
            {tab === 'org' && (
              <Section title="Organization" description="Basic identity shown across the app and exports.">
                <Field label="Organization Name" hint="Appears in exported file headers and reports.">
                  <input
                    type="text"
                    value={draft.org_name ?? ''}
                    onChange={(e) => set('org_name', e.target.value)}
                    disabled={!isAdmin}
                    className="settings-input"
                    placeholder="e.g. Agri Survey Dept."
                  />
                </Field>
                <Field label="Contact Email" hint="Used for system notifications and export metadata.">
                  <input
                    type="email"
                    value={draft.org_contact_email ?? ''}
                    onChange={(e) => set('org_contact_email', e.target.value)}
                    disabled={!isAdmin}
                    className="settings-input"
                    placeholder="admin@example.com"
                  />
                </Field>
                <Field label="Timezone" hint="Used for date labels in exports and analytics.">
                  <select
                    value={draft.timezone ?? 'Asia/Kolkata'}
                    onChange={(e) => set('timezone', e.target.value)}
                    disabled={!isAdmin}
                    className="settings-input"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </Field>
              </Section>
            )}

            {tab === 'workflow' && (
              <Section title="Survey Workflow" description="Control how surveys move through approval stages.">
                <Field label="Require QC Approval" hint="New surveys start as 'pending' and must be approved or rejected by a supervisor.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Toggle checked={on('require_approval')} onChange={() => toggle('require_approval')} disabled={!isAdmin} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {on('require_approval') ? 'Enabled — surveys need approval' : 'Disabled — surveys auto-approve'}
                    </span>
                  </div>
                </Field>
                <Field label="Allow Surveyors to Edit Drafts" hint="When on, surveyors can edit a draft before syncing.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Toggle checked={on('allow_draft_edit')} onChange={() => toggle('allow_draft_edit')} disabled={!isAdmin} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {on('allow_draft_edit') ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </Field>
                <Field label="Auto-reject After (days)" hint="Pending surveys older than this are auto-rejected. Set 0 to disable.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={draft.auto_reject_days ?? '0'}
                      onChange={(e) => set('auto_reject_days', e.target.value)}
                      disabled={!isAdmin}
                      className="settings-input"
                      style={{ width: 100 }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {Number(draft.auto_reject_days) === 0 ? 'Disabled' : `surveys older than ${draft.auto_reject_days} days`}
                    </span>
                  </div>
                </Field>
                <Field label="Default Export Format" hint="Pre-selected format on the Reports page.">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['csv', 'geojson'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => set('default_export_format', fmt)}
                        style={{
                          padding: '0.4rem 1rem', borderRadius: 6, border: '2px solid',
                          borderColor: draft.default_export_format === fmt ? 'var(--primary)' : 'var(--border)',
                          background: draft.default_export_format === fmt ? 'var(--primary)' : 'transparent',
                          color: draft.default_export_format === fmt ? '#fff' : 'var(--text)',
                          cursor: isAdmin ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500,
                          textTransform: 'uppercase', opacity: isAdmin ? 1 : 0.6,
                        }}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Survey Data Retention (days)" hint="Surveys older than this are eligible for archival. Set 0 to keep forever.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={3650}
                      value={draft.survey_retention_days ?? '365'}
                      onChange={(e) => set('survey_retention_days', e.target.value)}
                      disabled={!isAdmin}
                      className="settings-input"
                      style={{ width: 100 }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {Number(draft.survey_retention_days) === 0 ? 'Keep forever' : `${draft.survey_retention_days} days`}
                    </span>
                  </div>
                </Field>
              </Section>
            )}

            {tab === 'sync' && (
              <Section title="Sync & Offline" description="Control how the mobile app syncs data and caches map tiles.">
                <Field label="Auto-sync Interval (minutes)" hint="How often the mobile app attempts to sync surveys in the background.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={draft.sync_interval_minutes ?? '15'}
                      onChange={(e) => set('sync_interval_minutes', e.target.value)}
                      disabled={!isAdmin}
                      className="settings-input"
                      style={{ width: 100 }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      every {draft.sync_interval_minutes} min
                    </span>
                  </div>
                </Field>
                <Field label="Offline Tile Cache (days)" hint="Map tiles are cached for this many days before refreshing.">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['1', '3', '7', '14', '30'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => set('tile_cache_days', d)}
                        style={{
                          padding: '0.4rem 0.875rem', borderRadius: 6, border: '2px solid',
                          borderColor: draft.tile_cache_days === d ? 'var(--primary)' : 'var(--border)',
                          background: draft.tile_cache_days === d ? 'var(--primary)' : 'transparent',
                          color: draft.tile_cache_days === d ? '#fff' : 'var(--text)',
                          cursor: isAdmin ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: 500,
                          opacity: isAdmin ? 1 : 0.6,
                        }}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </Field>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text)' }}>Note:</strong> Sync interval and tile cache settings are read by the mobile app on next launch.
                    Changes take effect after the app restarts.
                  </p>
                </div>
              </Section>
            )}

            {tab === 'notifications' && (
              <Section title="Notifications" description="Control push notification behaviour for mobile app users.">
                <Field label="Push Notifications" hint="Enable FCM push notifications for survey status changes.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Toggle checked={on('push_notifications_enabled')} onChange={() => toggle('push_notifications_enabled')} disabled={!isAdmin} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {on('push_notifications_enabled') ? 'Push notifications enabled' : 'Push notifications disabled'}
                    </span>
                  </div>
                </Field>
                <Field label="Notification Sound" hint="Play a sound on mobile devices when a push notification arrives.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Toggle checked={on('notification_sound')} onChange={() => toggle('notification_sound')} disabled={!isAdmin || !on('push_notifications_enabled')} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {on('notification_sound') ? 'Sound on' : 'Silent'}
                      {!on('push_notifications_enabled') && ' (enable push first)'}
                    </span>
                  </div>
                </Field>

                <div style={{ marginTop: '1.5rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Events that trigger notifications
                  </p>
                  {[
                    { label: 'Survey approved', detail: 'Sent to the surveyor who submitted it' },
                    { label: 'Survey rejected', detail: 'Sent to the surveyor with rejection reason' },
                    { label: 'Survey assigned', detail: 'Sent to the assigned surveyor' },
                  ].map((ev) => (
                    <div key={ev.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.625rem 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{ev.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.detail}</div>
                      </div>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem',
                        borderRadius: 4, background: on('push_notifications_enabled') ? '#d1fae5' : '#f3f4f6',
                        color: on('push_notifications_enabled') ? '#065f46' : '#9ca3af',
                      }}>
                        {on('push_notifications_enabled') ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Footer save bar */}
          {isAdmin && (
            <div style={{
              borderTop: '1px solid var(--border)', padding: '1rem 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg)',
            }}>
              <span style={{ fontSize: '0.8rem', color: isDirty ? '#b45309' : 'var(--text-muted)' }}>
                {isDirty ? '● Unsaved changes' : saved ? '✓ Saved' : 'All changes saved'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => setDraft(settings!)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.875rem',
                    }}
                  >
                    Discard
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none',
                    background: isDirty ? 'var(--primary)' : '#d1d5db',
                    color: isDirty ? '#fff' : '#9ca3af',
                    cursor: isDirty ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem', fontWeight: 600,
                  }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .settings-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg);
          color: var(--text);
          font-size: 0.875rem;
          box-sizing: border-box;
        }
        .settings-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(22,163,74,0.15);
        }
        .settings-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{title}</h2>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{description}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
        {label}
      </label>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hint}</p>
      {children}
    </div>
  );
}
