import { useState, useEffect } from 'react';
import styles from './AuthModal.module.css';
import { authApi } from '../../api/api';

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onAuthSuccess?: () => void;
}

function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setErrors({});
      setServerError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    setServerError('');
  };

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Введите email';
    if (!formData.password) newErrors.password = 'Введите пароль';
    return newErrors;
  };

  const validateRegister = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Введите имя';
    if (!formData.email) newErrors.email = 'Введите email';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Некорректный email';
    if (!formData.password) newErrors.password = 'Введите пароль';
    else if (formData.password.length < 6) newErrors.password = 'Пароль минимум 6 символов';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Пароли не совпадают';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = mode === 'login' ? validateLogin() : validateRegister();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        await authApi.login(formData.email, formData.password);
      } else {
        await authApi.register(formData.name, formData.email, formData.password, formData.phone || undefined);
      }
      onClose();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      setServerError(err.message || 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setErrors({});
    setServerError('');
    onClose();
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setErrors({});
    setServerError('');
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        {serverError && (
          <div style={{ backgroundColor: 'rgba(244,67,54,0.1)', color: '#F44336', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
            {serverError}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Имя</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                className={`${styles.input} ${errors.name ? styles.error : ''}`} placeholder="Введите ваше имя" />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange}
              className={`${styles.input} ${errors.email ? styles.error : ''}`} placeholder="example@mail.ru" />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          {mode === 'register' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Телефон (необязательно)</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                className={styles.input} placeholder="+7 (___) ___-__-__" />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Пароль</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange}
              className={`${styles.input} ${errors.password ? styles.error : ''}`} placeholder="••••••••" />
            {errors.password && <span className={styles.errorText}>{errors.password}</span>}
          </div>

          {mode === 'register' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Подтверждение пароля</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                className={`${styles.input} ${errors.confirmPassword ? styles.error : ''}`} placeholder="••••••••" />
              {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className={styles.footer}>
          {mode === 'login' ? (
            <>Нет аккаунта? <button className={styles.toggleBtn} onClick={() => switchMode('register')}>Зарегистрироваться</button></>
          ) : (
            <>Уже есть аккаунт? <button className={styles.toggleBtn} onClick={() => switchMode('login')}>Войти</button></>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
