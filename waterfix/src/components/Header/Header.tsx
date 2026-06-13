import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../AuthModal/AuthModal';
import { useTheme } from '../../hooks/useTheme';
import styles from './Header.module.css';

type AuthMode = 'login' | 'register';
const API_URL = 'http://localhost:5000';
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isAuth: boolean;
  role?: string;
  avatarUrl?: string;
}

function Header() {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const syncUser = () => {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      else setCurrentUser(null);
    };
    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('userUpdated', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('userUpdated', syncUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    setCurrentUser(null);
    window.location.reload();
  };

  const handleAuthSuccess = () => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  };

  const getInitials = () => {
    if (!currentUser?.name) return '👤';
    const names = currentUser.name.split(' ');
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return names[0][0].toUpperCase();
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.leftSection}>
          <a href="/" className={styles.logo}>WaterFix</a>
        </div>

        <div className={styles.rightSection}>
          <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Переключить тему">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {currentUser ? (
            <>
              {currentUser.role === 'admin' && (
                <button className={styles.adminBtn} onClick={() => navigate('/admin')}>
                  ⚙️ Админ-панель
                </button>
              )}
              <button className={styles.profileBtn} onClick={() => navigate('/profile')}>
                <span className={styles.avatar}>
                  {currentUser.avatarUrl
                    ? <img src={`${API_URL}${currentUser.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : getInitials()
                  }
                </span>
                {currentUser.name}
              </button>
              <button className={styles.logoutBtn} onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <>
              <button className={styles.loginBtn} onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}>Войти</button>
              <button className={styles.registerBtn} onClick={() => { setAuthModalMode('register'); setIsAuthModalOpen(true); }}>Регистрация</button>
            </>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default Header;
