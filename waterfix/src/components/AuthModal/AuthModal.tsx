import { useState, useEffect } from 'react';
import styles from './AuthModal.module.css';

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onAuthSuccess?: () => void;
}

// Интерфейс для пользователя
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
}

function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');

  // Загружаем пользователей из localStorage
  const getUsers = (): User[] => {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  };

  // Сохраняем пользователей в localStorage
  const saveUsers = (users: User[]) => {
    localStorage.setItem('users', JSON.stringify(users));
  };

  // Сбрасываем режим при открытии
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
      setErrors({});
      setServerError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setServerError('');
  };

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Введите email';
    }
    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    }
    
    return newErrors;
  };

  const validateRegister = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) {
      newErrors.name = 'Введите имя';
    }
    if (!formData.email) {
      newErrors.email = 'Введите email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }
    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    } else if (formData.password.length < 3) {
      newErrors.password = 'Пароль должен быть не менее 3 символов';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }
    
    return newErrors;
  };

  const handleLogin = () => {
    const users = getUsers();
    const user = users.find(u => 
      (u.email === formData.email || u.phone === formData.email) && 
      u.password === formData.password
    );

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isAuth: true
      }));
      onClose(); // Закрываем модалку сразу
      if (onAuthSuccess) onAuthSuccess();
    } else {
      setServerError('Неверный email или пароль');
    }
  };

  const handleRegister = () => {
    const users = getUsers();
    
    if (users.some(u => u.email === formData.email)) {
      setServerError('Пользователь с таким email уже существует');
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      password: formData.password
    };

    users.push(newUser);
    saveUsers(users);

    localStorage.setItem('currentUser', JSON.stringify({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      isAuth: true
    }));

    onClose(); // Закрываем модалку сразу
    if (onAuthSuccess) onAuthSuccess();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = mode === 'login' ? validateLogin() : validateRegister();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (mode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const handleDemoLogin = (role: 'user' | 'admin') => {
    const demoUser = {
      id: role === 'admin' ? 'admin' : 'demo',
      name: role === 'admin' ? 'Администратор' : 'Демо-пользователь',
      email: role === 'admin' ? 'admin@waterfix.ru' : 'demo@waterfix.ru',
      phone: '+7 (999) 999-99-99',
      isAuth: true,
      role: role
    };
    
    localStorage.setItem('currentUser', JSON.stringify(demoUser));
    onClose(); // Закрываем модалку сразу
    if (onAuthSuccess) onAuthSuccess();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setServerError('');
    onClose();
  };

  const switchToLogin = () => {
    setMode('login');
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setServerError('');
  };

  const switchToRegister = () => {
    setMode('register');
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setServerError('');
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </h2>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        {serverError && (
          <div style={{ 
            backgroundColor: 'rgba(244, 67, 54, 0.1)', 
            color: '#F44336', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {serverError}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Имя</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`${styles.input} ${errors.name ? styles.error : ''}`}
                placeholder="Введите ваше имя"
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`${styles.input} ${errors.email ? styles.error : ''}`}
              placeholder="example@mail.ru"
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          {mode === 'register' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Телефон (необязательно)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Пароль</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`${styles.input} ${errors.password ? styles.error : ''}`}
              placeholder="••••••••"
            />
            {errors.password && <span className={styles.errorText}>{errors.password}</span>}
            {mode === 'register' && (
              <span className={styles.passwordHint}>Минимум 3 символа</span>
            )}
          </div>

          {mode === 'register' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Подтверждение пароля</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`${styles.input} ${errors.confirmPassword ? styles.error : ''}`}
                placeholder="••••••••"
              />
              {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
          )}

          <button type="submit" className={styles.submitBtn}>
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>или</span>
        </div>

        <button 
          className={styles.demoBtn}
          onClick={() => handleDemoLogin('user')}
        >
          👤 Войти как пользователь (демо)
        </button>
        <button 
          className={styles.demoBtn}
          onClick={() => handleDemoLogin('admin')}
        >
          👑 Войти как администратор (демо)
        </button>

        <div className={styles.footer}>
          {mode === 'login' ? (
            <>
              Нет аккаунта?
              <button 
                className={styles.toggleBtn}
                onClick={switchToRegister}
              >
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?
              <button 
                className={styles.toggleBtn}
                onClick={switchToLogin}
              >
                Войти
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;