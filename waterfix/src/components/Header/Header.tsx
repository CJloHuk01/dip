import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import styles from './Header.module.css';

function Header() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <span className={styles.logoIcon}>💧</span>
        WaterFix
      </Link>

      <div className={styles.rightSection}>
        {!isAdmin && (
          <Link to="/admin" className={styles.adminLink}>
            Админ
          </Link>
        )}
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Переключить тему"
          title="Переключить тему"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

export default Header;
