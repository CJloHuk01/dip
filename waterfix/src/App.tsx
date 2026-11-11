import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage/LandingPage';
import PublicFormPage from './pages/PublicFormPage/PublicFormPage';
import AdminLoginPage from './pages/AdminLoginPage/AdminLoginPage';
import AdminPage from './pages/AdminPage/AdminPage';
import LegalPage from './pages/LegalPage/LegalPage';
import CookieConsent from './components/CookieConsent/CookieConsent';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/r/:code" element={<PublicFormPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/legal/:doc" element={<LegalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}

export default App;
