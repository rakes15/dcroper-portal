import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiLogin(mobile, password);
      const { token, id, name, role, mobile: mob } = res.data;
      login(token, { id, name, role, mobile: mob });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left panel — brand */}
      <div className="login-panel">
        <div className="login-panel-content">
          <img src="/logo.png" alt="dCroPER" className="login-logo-img" />
          <h2 className="login-tagline">Field Survey<br />Management Portal</h2>
          <p className="login-description">
            Manage projects, review field surveys, approve submissions, and track agricultural data — all from one place.
          </p>
          <ul className="login-features">
            <li><span className="feat-icon">📍</span>Real-time GPS survey tracking</li>
            <li><span className="feat-icon">📊</span>Analytics &amp; reporting</li>
            <li><span className="feat-icon">✅</span>QC approval workflow</li>
            <li><span className="feat-icon">🗺</span>Interactive map view</li>
          </ul>
        </div>
        <div className="login-panel-footer">
          dCroPER Agriculture Suite
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h1>Welcome back</h1>
            <p>Sign in to your admin account</p>
          </div>

          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="mobile">Mobile Number</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">📱</span>
                <input
                  id="mobile"
                  type="text"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter your mobile number"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-show-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="login-hint">
            Admin &amp; supervisor access only
          </p>
        </div>
      </div>
    </div>
  );
}

