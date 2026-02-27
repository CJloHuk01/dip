import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../AuthModal/AuthModal';
import styles from './Header.module.css';

type AuthMode = 'login' | 'register' | 'success';

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

  // Загружаем пользователя при монтировании
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

  // Получаем инициалы для аватара
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
        <a href="/" className={styles.logo}>
          WaterFix
        </a>
        
        <div className={styles.buttons}>
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
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default Header;