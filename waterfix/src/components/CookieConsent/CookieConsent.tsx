import { useState } from 'react';
import { Link } from 'react-router-dom';
import { legalConfig, legalRoutes } from '../../legal/legalConfig';
import { readCookieConsent, saveCookieConsent } from '../../utils/cookieConsent';
import styles from './CookieConsent.module.css';

function CookieConsent() {
  const [visible, setVisible] = useState(() => !readCookieConsent());
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  if (!visible) return null;

  const acceptAll = () => {
    saveCookieConsent(true, true);
    setVisible(false);
  };

  const acceptNecessary = () => {
    saveCookieConsent(false, false);
    setVisible(false);
  };

  const saveChoice = () => {
    saveCookieConsent(analytics, marketing);
    setVisible(false);
  };

  return (
    <div className={styles.banner} role="dialog" aria-label="Использование файлов cookie">
      <div className={styles.content}>
        <p className={styles.text}>
          Мы используем файлы cookie и localStorage, чтобы вы могли войти в аккаунт,
          сохранить настройки темы и не видеть это уведомление повторно.
          Подробнее — в{' '}
          <Link to={legalRoutes.cookies} className={styles.link}>Политике cookie</Link>{' '}
          и{' '}
          <Link to={legalRoutes.privacy} className={styles.link}>Политике конфиденциальности</Link>.
        </p>

        {showSettings && (
          <div className={styles.settings}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked disabled className={styles.checkbox} />
              <span>Необходимые — всегда включены</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Аналитические — помогают улучшать сервис</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Маркетинговые — для показа релевантных предложений</span>
            </label>
            <p className={styles.note}>
              Аналитические и маркетинговые cookie сейчас не подключены. Выбор сохранится
              на случай, если они появятся.
            </p>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {showSettings ? (
          <>
            <button type="button" className={styles.secondaryBtn} onClick={() => setShowSettings(false)}>
              Назад
            </button>
            <button type="button" className={styles.primaryBtn} onClick={saveChoice}>
              Сохранить выбор
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.secondaryBtn} onClick={acceptNecessary}>
              Только необходимые
            </button>
            <button type="button" className={styles.linkBtn} onClick={() => setShowSettings(true)}>
              Настроить
            </button>
            <button type="button" className={styles.primaryBtn} onClick={acceptAll}>
              Принять все
            </button>
          </>
        )}
      </div>

      <span className={styles.copyright}>Версия документов {legalConfig.docsVersion}</span>
    </div>
  );
}

export default CookieConsent;
