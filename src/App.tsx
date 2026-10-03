import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Surveys from './pages/Surveys';
import SurveyDetail from './pages/SurveyDetail';
import Users from './pages/Users';
import MapView from './pages/MapView';
import ProjectAnalytics from './pages/ProjectAnalytics';
import ProjectForm from './pages/ProjectForm';
import FormBuilder from './pages/FormBuilder';
import SurveyAnalytics from './pages/SurveyAnalytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ProjectLifecycle from './pages/ProjectLifecycle';
import SurveyTemplates from './pages/SurveyTemplates';
import Masters from './pages/Masters';
import FieldMasters from './pages/FieldMasters';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="surveys/:id" element={<SurveyDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="map" element={<MapView />} />
        <Route path="projects/:id/analytics" element={<ProjectAnalytics />} />
        <Route path="projects/:id/lifecycle" element={<ProjectLifecycle />} />
        <Route path="projects/:id/templates" element={<SurveyTemplates />} />
        <Route path="projects/:id/form" element={<ProjectForm />} />
        <Route path="projects/:id/form/edit" element={<FormBuilder />} />
        <Route path="analytics" element={<SurveyAnalytics />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="masters" element={<Masters />} />
        <Route path="field-masters" element={<FieldMasters />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
