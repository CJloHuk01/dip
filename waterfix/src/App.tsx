import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage/MainPage';
import MachinePage from './pages/MachinePage/MachinePage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import AdminPage from './pages/AdminPage/AdminPage';
import LegalPage from './pages/LegalPage/LegalPage';
import CookieConsent from './components/CookieConsent/CookieConsent';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/machine/:id" element={<MachinePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/legal/:doc" element={<LegalPage />} />
      </Routes>
      <CookieConsent />
    </BrowserRouter>
  );
}

export default App;
