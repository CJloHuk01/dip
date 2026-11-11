import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { API_ORIGIN } from '../../api/config';
import { ApiError, publicApi, type PublicMachine } from '../../api/api';
import { legalConfig } from '../../legal/legalConfig';
import styles from './PublicFormPage.module.css';

const PROBLEM_TYPES = [
  { value: 'money', label: 'Зажевало деньги', icon: '💸' },
  { value: 'water', label: 'Не наливает воду', icon: '🚱' },
  { value: 'change', label: 'Не даёт сдачу', icon: '🪙' },
  { value: 'screen', label: 'Сломан экран', icon: '📵' },
  { value: 'other', label: 'Другое', icon: '❓' },
];

const CONTACT_TYPES = [
  { value: 'phone', label: 'Телефон', placeholder: '+7 (___) ___-__-__', inputType: 'tel' },
  { value: 'email', label: 'Email', placeholder: 'you@example.com', inputType: 'email' },
  { value: 'telegram', label: 'Telegram', placeholder: '@username или ссылка', inputType: 'text' },
  { value: 'vk', label: 'VK', placeholder: 'vk.com/... или @username', inputType: 'text' },
  { value: 'max', label: 'MAX', placeholder: '@username или ссылка', inputType: 'text' },
  { value: 'other', label: 'Другое', placeholder: 'Как с вами связаться', inputType: 'text' },
];

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${Math.round(bytes / 1024)} КБ`;
}

function photoSrc(url: string) {
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
}

function sanitizePhone(value: string) {
  return value.replace(/[^\d+()\-\s]/g, '');
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, '');
}

function PublicFormPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [machine, setMachine] = useState<PublicMachine | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [type, setType] = useState('');
  const [comment, setComment] = useState('');
  const [contactType, setContactType] = useState('phone');
  const [contactValue, setContactValue] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [website, setWebsite] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [filesError, setFilesError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      setLoadError('В ссылке нет кода водомата.');
      setLoading(false);
      return;
    }

    publicApi.getMachine(normalized)
      .then(data => { if (!cancelled) setMachine(data); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить водомат.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [code]);

  const photoPreviews = useMemo(
    () => photos.map(file => ({ file, url: URL.createObjectURL(file) })),
    [photos],
  );

  useEffect(() => {
    return () => { photoPreviews.forEach(item => URL.revokeObjectURL(item.url)); };
  }, [photoPreviews]);

  const videoPreview = useMemo(
    () => (video ? URL.createObjectURL(video) : ''),
    [video],
  );

  useEffect(() => {
    return () => { if (videoPreview) URL.revokeObjectURL(videoPreview); };
  }, [videoPreview]);

  const contactMeta = CONTACT_TYPES.find(item => item.value === contactType) ?? CONTACT_TYPES[0];

  const addPhotos = (fileList: FileList | null) => {
    if (!fileList) return;
    setFilesError('');
    const next = [...photos];

    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_PHOTOS) {
        setFilesError(`Можно прикрепить не больше ${MAX_PHOTOS} фото.`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        setFilesError('Фото должны быть изображениями (JPG, PNG или WebP).');
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setFilesError(`Каждое фото — не больше ${formatSize(MAX_PHOTO_SIZE)}.`);
        continue;
      }
      next.push(file);
    }

    setPhotos(next);
  };

  const addVideo = (file: File | null) => {
    if (!file) return;
    setFilesError('');

    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
      || /\.(mp4|webm|mov)$/i.test(file.name);

    if (!isVideo) {
      setFilesError('Видео должно быть в формате MP4, WebM или MOV.');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setFilesError(`Видео — не больше ${formatSize(MAX_VIDEO_SIZE)}.`);
      return;
    }

    setVideo(file);
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!type) next.type = 'Выберите, что случилось.';
    if (!contactType) next.contactType = 'Выберите способ связи.';
    if (contactType === 'phone') {
      const digits = phoneDigits(contactValue);
      if (digits.length < 10) {
        next.contactValue = 'Введите номер телефона полностью — не менее 10 цифр.';
      } else if (digits.length > 15) {
        next.contactValue = 'Слишком длинный номер телефона.';
      }
    } else if (contactValue.trim().length < 3) {
      next.contactValue = 'Укажите контакт, чтобы администратор мог ответить.';
    }
    if (contactType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue.trim())) {
      next.contactValue = 'Проверьте адрес электронной почты.';
    }
    if (!privacy) next.privacy = 'Без согласия на обработку данных мы не можем принять заявку.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setType('');
    setComment('');
    setContactValue('');
    setReporterName('');
    setPrivacy(false);
    setPhotos([]);
    setVideo(null);
    setFilesError('');
    setErrors({});
    setSubmitError('');
    setSuccess(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('MachineCode', code.trim().toUpperCase());
      formData.append('Type', type);
      formData.append('TypeLabel', PROBLEM_TYPES.find(item => item.value === type)?.label ?? 'Другое');
      formData.append('Comment', comment.trim());
      formData.append('ContactType', contactType);
      formData.append('ContactValue', contactValue.trim());
      formData.append('ReporterName', reporterName.trim());
      formData.append('PrivacyAccepted', String(privacy));
      formData.append('PrivacyVersion', legalConfig.docsVersion);
      formData.append('Website', website);

      photos.forEach(file => formData.append('photos', file));
      if (video) formData.append('video', video);

      await publicApi.createComplaint(formData);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.status === 429
          ? 'Слишком много заявок с этого адреса. Попробуйте позже.'
          : err.message);
      } else {
        setSubmitError('Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.center}>
          <div className={styles.loader}>Загружаем информацию о водомате…</div>
        </main>
      </div>
    );
  }

  if (loadError || !machine) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.center}>
          <div className={styles.errorCard}>
            <div className={styles.bigIcon} aria-hidden="true">🔎</div>
            <h1 className={styles.cardTitle}>Водомат не найден</h1>
            <p className={styles.muted}>{loadError || 'Проверьте QR-код и попробуйте ещё раз.'}</p>
            <Link className={styles.primaryLink} to="/">На главную</Link>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.center}>
          <div className={styles.successCard}>
            <div className={styles.bigIcon} aria-hidden="true">✅</div>
            <h1 className={styles.cardTitle}>Заявка отправлена</h1>
            <p className={styles.muted}>
              Спасибо! Администратор получил информацию о проблеме и свяжется с вами
              по указанному контакту.
            </p>
            <div className={styles.successActions}>
              <button type="button" className={styles.primaryBtn} onClick={resetForm}>
                Отправить ещё одну заявку
              </button>
              <Link className={styles.secondaryLink} to="/">На главную</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.machineCard}>
            {machine.photoUrl && (
              <img
                className={styles.machinePhoto}
                src={photoSrc(machine.photoUrl)}
                alt={`Водомат ${machine.address}`}
                loading="lazy"
              />
            )}
            <div className={styles.machineInfo}>
              <div className={styles.machineLabel}>Вы сообщаете о проблеме на водомате</div>
              <h1 className={styles.machineAddress}>{machine.address}</h1>
              <div className={styles.metaRow}>
                <span className={`${styles.status} ${styles[`status_${machine.status}`] ?? ''}`}>
                  {machine.status === 'working' ? 'Работает' : machine.status === 'maintenance' ? 'На обслуживании' : 'Есть проблема'}
                </span>
                <span className={styles.meta}>{machine.workingHours}</span>
                <span className={styles.meta}>{machine.waterPrice}</span>
              </div>
              {machine.phone && (
                <a className={styles.machinePhone} href={`tel:${machine.phone}`}>{machine.phone}</a>
              )}
            </div>
          </section>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="website">Не заполняйте это поле</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={event => setWebsite(event.target.value)}
              />
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Что случилось?</legend>
              <div className={styles.problemGrid}>
                {PROBLEM_TYPES.map(item => (
                  <label
                    key={item.value}
                    className={`${styles.problemOption} ${type === item.value ? styles.problemOptionActive : ''}`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={item.value}
                      checked={type === item.value}
                      onChange={() => setType(item.value)}
                    />
                    <span className={styles.problemIcon} aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              {errors.type && <p className={styles.errorText}>{errors.type}</p>}
            </fieldset>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="comment">Комментарий <span className={styles.optional}>(необязательно)</span></label>
              <textarea
                id="comment"
                className={styles.textarea}
                rows={4}
                maxLength={2000}
                placeholder="Например: не наливает воду после оплаты, на экране ошибка"
                value={comment}
                onChange={event => setComment(event.target.value)}
              />
              <div className={styles.counter}>{comment.length} / 2000</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contactType">Как с вами связаться?</label>
              <div className={styles.contactRow}>
                <select
                  id="contactType"
                  className={styles.select}
                  value={contactType}
                  onChange={event => { setContactType(event.target.value); setContactValue(''); }}
                >
                  {CONTACT_TYPES.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <input
                  className={styles.input}
                  type={contactMeta.inputType}
                  inputMode={contactType === 'phone' ? 'tel' : undefined}
                  placeholder={contactMeta.placeholder}
                  value={contactValue}
                  maxLength={200}
                  onChange={event => setContactValue(
                    contactType === 'phone' ? sanitizePhone(event.target.value) : event.target.value,
                  )}
                  aria-invalid={Boolean(errors.contactValue)}
                />
              </div>
              {errors.contactValue && <p className={styles.errorText}>{errors.contactValue}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reporterName">Ваше имя <span className={styles.optional}>(необязательно)</span></label>
              <input
                id="reporterName"
                className={styles.input}
                type="text"
                maxLength={100}
                placeholder="Как к вам обращаться"
                value={reporterName}
                onChange={event => setReporterName(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Фото и видео <span className={styles.optional}>(необязательно)</span></span>

              <div className={styles.uploadRow}>
                <label className={styles.uploadBtn}>
                  📷 Добавить фото
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={event => { addPhotos(event.target.files); event.target.value = ''; }}
                  />
                </label>
                <span className={styles.uploadHint}>
                  до {MAX_PHOTOS} фото, каждое до {formatSize(MAX_PHOTO_SIZE)}
                </span>
              </div>

              {photoPreviews.length > 0 && (
                <div className={styles.previews}>
                  {photoPreviews.map(item => (
                    <div className={styles.preview} key={item.url}>
                      <img src={item.url} alt={item.file.name} />
                      <button
                        type="button"
                        className={styles.removeBtn}
                        aria-label={`Удалить ${item.file.name}`}
                        onClick={() => setPhotos(current => current.filter(file => file !== item.file))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.uploadRow}>
                <label className={styles.uploadBtn}>
                  🎬 Добавить видео
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    hidden
                    onChange={event => { addVideo(event.target.files?.[0] ?? null); event.target.value = ''; }}
                  />
                </label>
                <span className={styles.uploadHint}>одно видео до {formatSize(MAX_VIDEO_SIZE)}</span>
              </div>

              {video && (
                <div className={styles.videoPreview}>
                  <video src={videoPreview} controls preload="metadata" />
                  <div className={styles.videoMeta}>
                    <span>{video.name} · {formatSize(video.size)}</span>
                    <button type="button" className={styles.removeLink} onClick={() => setVideo(null)}>
                      Удалить
                    </button>
                  </div>
                </div>
              )}

              {filesError && <p className={styles.errorText}>{filesError}</p>}
            </div>

            <label className={styles.consent}>
              <input
                type="checkbox"
                checked={privacy}
                onChange={event => setPrivacy(event.target.checked)}
              />
              <span>
                Я согласен на обработку персональных данных в соответствии с{' '}
                <Link to="/legal/privacy" target="_blank" rel="noopener noreferrer">
                  Политикой конфиденциальности
                </Link>
              </span>
            </label>
            {errors.privacy && <p className={styles.errorText}>{errors.privacy}</p>}

            {submitError && <div className={styles.submitError}>{submitError}</div>}

            <button className={styles.submitBtn} type="submit" disabled={submitting}>
              {submitting ? 'Отправляем…' : 'Отправить заявку'}
            </button>

            <p className={styles.footnote}>
              Контакт нужен только для связи по этой заявке. Мы не создаём аккаунт
              и не публикуем ваши данные.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

export default PublicFormPage;
