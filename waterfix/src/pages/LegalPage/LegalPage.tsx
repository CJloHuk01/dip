import { Link, Navigate, useParams } from 'react-router-dom';
import { legalDocuments } from '../../legal/legalDocuments';
import { legalConfig, type LegalDocId } from '../../legal/legalConfig';
import styles from './LegalPage.module.css';

const docIds: LegalDocId[] = ['terms', 'privacy', 'cookies'];

function LegalPage() {
  const { doc } = useParams<{ doc: string }>();

  if (!doc || !docIds.includes(doc as LegalDocId)) {
    return <Navigate to="/" replace />;
  }

  const document = legalDocuments[doc as LegalDocId];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>{legalConfig.siteName}</Link>
        <Link to="/" className={styles.backLink}>← На главную</Link>
      </header>

      <main className={styles.container}>
        <h1 className={styles.title}>{document.title}</h1>
        <p className={styles.subtitle}>{document.subtitle}</p>

        {document.sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text} className={styles.paragraph}>{text}</p>
            ))}
            {section.list && (
              <ul className={styles.list}>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <nav className={styles.otherDocs}>
          <span className={styles.otherDocsTitle}>Другие документы:</span>
          {docIds.filter((id) => id !== document.id).map((id) => (
            <Link key={id} to={`/legal/${id}`} className={styles.docLink}>
              {legalDocuments[id].title}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

export default LegalPage;
