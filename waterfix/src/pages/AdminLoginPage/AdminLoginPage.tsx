import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { ApiError, adminApi } from '../../api/api';
import styles from './AdminLoginPage.module.css';

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.me()
      .then(() => { if (!cancelled) navigate('/admin', { replace: true }); })
      .catch(() => { /* не авторизован */ })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Введите email и пароль.');
      return;
    }

    setLoading(true);
    try {
      await adminApi.login(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.center}>
          <div className={styles.loader}>Проверяем сессию…</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.center}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.icon} aria-hidden="true">🔐</div>
          <h1 className={styles.title}>Вход в админ-панель</h1>
          <p className={styles.subtitle}>Только для администраторов WaterFix</p>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Входим…' : 'Войти'}
          </button>

          <Link className={styles.back} to="/">← На главную</Link>
        </form>
      </main>
    </div>
  );
}

export default AdminLoginPage;
