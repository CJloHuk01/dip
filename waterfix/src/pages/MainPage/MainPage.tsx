import Header from '../../components/Header/Header';
import Map from '../../components/Map/Map';
import styles from './MainPage.module.css';

function MainPage() {
  return (
    <div className={styles.page}>
      <Header />
      <Map />
    </div>
  );
}

export default MainPage;