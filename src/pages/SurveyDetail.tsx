import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSurvey } from '../api/surveys';
import type { SurveyDetail as SurveyDetailData } from '../api/surveys';

export default function SurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getSurvey(id)
      .then((r) => setSurvey(r.data))
      .catch(() => setError('Survey not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading survey…</div>;
  if (error || !survey) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Survey not found</div>
      <div style={{ color: '#6b7280', marginBottom: 24 }}>The survey may not have synced to the server yet.</div>
      <button onClick={() => navigate('/surveys')} style={btnStyle}>← Back to Surveys</button>
    </div>
  );

  const formResponse = survey.form_response || {};
  const geometry = survey.geometry || {};
  const internalNotes = formResponse['_internal_notes'] as string | undefined;
  const formFields = Object.entries(formResponse).filter(([k]) => !k.startsWith('_'));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/surveys')} style={backBtnStyle}>←</button>
        <div>
          <h1 className="page-title" style={{ fontSize: 20 }}>Survey Detail</h1>
          <p className="page-subtitle" style={{ fontFamily: 'monospace', fontSize: 12 }}>{survey.id}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Meta card */}
        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>Survey Info</div>
          <dl style={dlStyle}>
            <FieldRow label="Status">
              {survey.status === 'submitted' || survey.status === 'pending'
                ? <span className="badge badge-synced">Submitted</span>
                : survey.status === 'finalized'
                  ? <span className="badge badge-finalized">Finalized</span>
                  : <span className="badge badge-draft">Draft</span>}
            </FieldRow>
            <FieldRow label="Type">{survey.geometry_type}</FieldRow>
            <FieldRow label="Project"><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{survey.project_id}</span></FieldRow>
            <FieldRow label="Created">{new Date(survey.created_at).toLocaleString()}</FieldRow>
            {survey.updated_at && <FieldRow label="Updated">{new Date(survey.updated_at).toLocaleString()}</FieldRow>}
            {survey.accuracy && <FieldRow label="Accuracy">±{survey.accuracy.toFixed(1)} m</FieldRow>}
          </dl>
        </div>

        {/* Geometry card */}
        {survey.geometry_data && (
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>Geometry</div>
            <dl style={dlStyle}>
              <FieldRow label="Type">{geometry.type || survey.geometry_type}</FieldRow>
              {geometry.type === 'Point' && Array.isArray(geometry.coordinates) && (
                <>
                  <FieldRow label="Longitude">{(geometry.coordinates as number[])[0]?.toFixed(6)}</FieldRow>
                  <FieldRow label="Latitude">{(geometry.coordinates as number[])[1]?.toFixed(6)}</FieldRow>
                </>
              )}
              {geometry.type === 'Polygon' && Array.isArray(geometry.coordinates) && (
                <FieldRow label="Vertices">
                  {(geometry.coordinates as number[][][])[0]?.length ?? 0} points
                </FieldRow>
              )}
            </dl>
            <pre style={codeStyle}>{JSON.stringify(geometry, null, 2)}</pre>
          </div>
        )}

        {/* Form response */}
        {formFields.length > 0 && (
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>Form Data</div>
            <dl style={dlStyle}>
              {formFields.map(([key, val]) => (
                <FieldRow key={key} label={key}>{String(val)}</FieldRow>
              ))}
            </dl>
          </div>
        )}

        {/* Internal notes */}
        {internalNotes && (
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>📝 Internal Notes</div>
            <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>{internalNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid #f0faf2' }}>
      <dt style={{ fontSize: 12, color: '#6b7280', width: 100, flexShrink: 0, paddingTop: 2 }}>{label}</dt>
      <dd style={{ fontSize: 14, margin: 0, color: '#1a1a1a' }}>{children}</dd>
    </div>
  );
}

const dlStyle: React.CSSProperties = { margin: 0 };
const codeStyle: React.CSSProperties = {
  background: '#f8fdf9', border: '1px solid #e0f0e6', borderRadius: 8,
  padding: '10px 12px', fontSize: 11, overflow: 'auto', marginTop: 12,
  maxHeight: 180, color: '#374151',
};
const btnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#40916c', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
};
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #e0f0e6', borderRadius: 8,
  padding: '6px 12px', cursor: 'pointer', fontSize: 18, color: '#1a3a2a',
};
