import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../AuthModal/AuthModal';
import { useTheme } from '../../hooks/useTheme';
import styles from './Header.module.css';

type AuthMode = 'login' | 'register';
const API_URL = import.meta.env.VITE_API_URL;
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

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
                <span className={styles.profileName}>{currentUser.name}</span>
              </button>
              <button className={styles.logoutBtn} onClick={handleLogout}>Выйти</button>

              <div className={styles.menuWrap} ref={menuRef}>
                <button
                  type="button"
                  className={styles.menuBtn}
                  onClick={() => setIsMenuOpen(prev => !prev)}
                  aria-label="Открыть меню"
                  aria-haspopup="true"
                  aria-expanded={isMenuOpen}
                >
                  ⋯
                </button>

                {isMenuOpen && (
                  <div className={styles.mobileMenu} role="menu">
                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        onClick={() => { setIsMenuOpen(false); navigate('/admin'); }}
                      >
                        ⚙️ Админ-панель
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.menuItem}
                      onClick={() => { setIsMenuOpen(false); navigate('/profile'); }}
                    >
                      👤 Профиль
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`${styles.menuItem} ${styles.menuItemDanger}`}
                      onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>
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
