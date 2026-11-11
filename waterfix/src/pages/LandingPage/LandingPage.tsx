import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header';
import styles from './LandingPage.module.css';

function LandingPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.icon} aria-hidden="true">💧</div>
          <h1 className={styles.title}>Водомат не работает?</h1>
          <p className={styles.lead}>
            Отсканируйте QR-код на корпусе водомата и расскажите, что случилось.
            Это займёт меньше минуты.
          </p>

          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber}>1</span>
              Наведите камеру телефона на QR-код на водомате
            </li>
            <li>
              <span className={styles.stepNumber}>2</span>
              Выберите проблему и опишите её
            </li>
            <li>
              <span className={styles.stepNumber}>3</span>
              Оставьте удобный контакт — администратор свяжется с вами
            </li>
          </ol>

          <p className={styles.hint}>
            Если QR-код не читается, сообщите адрес водомата администратору.
          </p>

          <div className={styles.links}>
            <Link to="/legal/privacy">Политика конфиденциальности</Link>
            <Link to="/legal/cookies">Политика cookie</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
