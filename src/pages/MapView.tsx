import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_COLOR: Record<string, string> = {
  approved: '#059669', submitted: '#3b82f6', pending: '#f59e0b',
  finalized: '#8b5cf6', rejected: '#dc2626', draft: '#9ca3af',
};

const TILE_LAYERS = {
  osm: [
    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors', opacity: 1 },
  ],
  satellite: [
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri World Imagery', opacity: 1 },
  ],
  hybrid: [
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri', opacity: 1 },
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', attribution: '', opacity: 1 },
  ],
};

type MapMode = 'osm' | 'satellite' | 'hybrid';

export default function MapView() {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRefs = useRef<L.TileLayer[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mapMode, setMapMode] = useState<MapMode>('osm');

  useEffect(() => {
    Promise.all([getSurveys(), getProjects()])
      .then(([s, p]) => { setSurveys(s.data); setProjects(p.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Init map (no tile layer here — tile effect handles it)
  useEffect(() => {
    if (loading || !containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { preferCanvas: true }).setView([20, 78], 5);
    mapRef.current = map;
    setMapReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRefs.current = [];
      setMapReady(false);
    };
  }, [loading]);

  // Switch tile layers when mapMode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileLayerRefs.current.forEach((l) => map.removeLayer(l));
    tileLayerRefs.current = [];
    TILE_LAYERS[mapMode].forEach(({ url, attribution, opacity }) => {
      const layer = L.tileLayer(url, { attribution, opacity, maxZoom: 19 });
      layer.addTo(map);
      tileLayerRefs.current.push(layer);
    });
  }, [mapMode, mapReady]);

  // Redraw markers when filters or surveys change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if ((layer as any)._isSurveyLayer) map.removeLayer(layer);
    });

    const filtered = surveys.filter((s) => {
      if (projectFilter !== 'all' && s.project_id !== projectFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });

    const bounds: L.LatLngTuple[] = [];

    for (const s of filtered) {
      if (!s.geometry) continue;
      let geo: any;
      try { geo = JSON.parse(s.geometry); } catch { continue; }
      const color = STATUS_COLOR[s.status] ?? '#9ca3af';
      const popup = `
        <div style="font-family:sans-serif;min-width:160px">
          <b style="font-size:13px">${s.geometry_type?.toUpperCase()}</b><br>
          <span style="font-size:11px;color:#6b7280">${s.id.slice(0, 12)}…</span><br>
          <span style="color:${color};font-size:12px;font-weight:600">${s.status}</span><br>
          ${s.assigned_to_name ? `<span style="font-size:12px">👤 ${s.assigned_to_name}</span><br>` : ''}
          <a href="#" data-id="${s.id}" style="font-size:12px;color:#40916c">View detail →</a>
        </div>`;

      let layer: L.Layer | null = null;
      if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
        const [lng, lat] = geo.coordinates as number[];
        if (isFinite(lat) && isFinite(lng)) {
          const circle = L.circleMarker([lat, lng], {
            radius: 8, fillColor: color, fillOpacity: 0.85, color: '#fff', weight: 2,
          }).bindPopup(popup);
          (circle as any)._isSurveyLayer = true;
          circle.addTo(map);
          bounds.push([lat, lng]);
          layer = circle;
        }
      } else if (geo.type === 'Polygon' && Array.isArray(geo.coordinates)) {
        const ring = (geo.coordinates[0] as number[][]).map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
        if (ring.length > 2) {
          const poly = L.polygon(ring, { color, fillColor: color, fillOpacity: 0.3, weight: 2 }).bindPopup(popup);
          (poly as any)._isSurveyLayer = true;
          poly.addTo(map);
          ring.forEach((ll) => bounds.push(ll));
          layer = poly;
        }
      }

      if (layer) {
        layer.on('popupopen', () => {
          const container = (layer as any).getPopup()?.getElement?.();
          container?.querySelector?.('a[data-id]')?.addEventListener?.('click', (e: Event) => {
            e.preventDefault();
            navigate(`/surveys/${s.id}`);
          });
        });
      }
    }
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveys, projectFilter, statusFilter, mapReady]);

  const statuses = ['all', 'approved', 'submitted', 'pending', 'rejected', 'draft'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Map View</h1>
        <p className="page-subtitle">{surveys.length} surveys</p>
      </div>

      {/* Filters + tile mode row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selectStyle}>
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1px solid #e0f0e6', cursor: 'pointer',
              background: statusFilter === s ? (STATUS_COLOR[s] ?? '#40916c') : '#fff',
              color: statusFilter === s ? '#fff' : '#374151',
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Tile layer toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #e0f0e6' }}>
          {(['osm', 'satellite', 'hybrid'] as MapMode[]).map((mode) => (
            <button key={mode} onClick={() => setMapMode(mode)} style={{
              padding: '5px 14px', fontSize: 12, fontWeight: 600, border: 'none',
              cursor: 'pointer', borderRight: mode !== 'hybrid' ? '1px solid #e0f0e6' : 'none',
              background: mapMode === mode ? '#40916c' : '#fff',
              color: mapMode === mode ? '#fff' : '#374151',
            }}>
              {mode === 'osm' ? '🗺️ Map' : mode === 'satellite' ? '🛰️ Satellite' : '🌍 Hybrid'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading map…</div>
      ) : (
        <div ref={containerRef} style={{
          height: 'calc(100vh - 260px)', minHeight: 400,
          borderRadius: 12, overflow: 'hidden', border: '1px solid #e0f0e6',
        }} />
      )}

      {!loading && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: '#374151' }}>
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, border: '1px solid #e0f0e6',
  fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer',
};
