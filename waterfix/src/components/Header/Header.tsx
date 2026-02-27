import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../AuthModal/AuthModal';
import { useTheme } from '../../hooks/useTheme';
import styles from './Header.module.css';

type AuthMode = 'login' | 'register';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isAuth: boolean;
  role?: string;
}

function Header() {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    window.location.reload();
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleAuthSuccess = () => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  };

  const getInitials = () => {
    if (!currentUser?.name) return '👤';
    const names = currentUser.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.leftSection}>
          <a href="/" className={styles.logo}>
            WaterFix
          </a>
        </div>
        
        <div className={styles.rightSection}>
          <button 
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label="Переключить тему"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {currentUser ? (
            <>
              <button 
                className={styles.profileBtn}
                onClick={handleProfileClick}
              >
                <span className={styles.avatar}>
                  {getInitials()}
                </span>
                {currentUser.name}
              </button>
              <button 
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <button 
                className={styles.loginBtn}
                onClick={handleOpenLogin}
              >
                Войти
              </button>
              <button 
                className={styles.registerBtn}
                onClick={handleOpenRegister}
              >
                Регистрация
              </button>
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