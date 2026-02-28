import { useState, useRef, useEffect } from 'react';
import styles from './ComplaintModal.module.css';
import type { Marker } from '../../types';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Marker | null;
}

type ProblemType = 'money' | 'water' | 'change' | 'screen' | 'other';

function ComplaintModal({ isOpen, onClose, machine }: ComplaintModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState({
    problemType: '' as ProblemType | '',
    comment: '',
    photo: null as File | null,
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setFormData({
        problemType: '',
        comment: '',
        photo: null,
        phone: ''
      });
      setPhotoPreview(null);
      setErrors({});
    }
  }, [isOpen, machine]);

  if (!isOpen || !machine) return null;

  const problemTypes = [
    { value: 'money', label: 'Зажевало деньги' },
    { value: 'water', label: 'Не наливает воду' },
    { value: 'change', label: 'Не даёт сдачу' },
    { value: 'screen', label: 'Сломан экран' },
    { value: 'other', label: 'Другое' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 5 МБ');
        return;
      }

      setFormData(prev => ({ ...prev, photo: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo: null }));
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.problemType) {
      newErrors.problemType = 'Выберите тип проблемы';
    }
    
    const isAuth = localStorage.getItem('isAuth') === 'true';
    if (!isAuth && !formData.phone) {
      newErrors.phone = 'Введите телефон для связи';
    } else if (!isAuth && formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        newErrors.phone = 'Введите корректный номер телефона';
      }
    }
    
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    console.log('Новая заявка:', {
      machineId: machine.id,
      machineAddress: machine.address,
      ...formData,
      photo: formData.photo ? {
        name: formData.photo.name,
        size: formData.photo.size,
        type: formData.photo.type
      } : null
    });

    setStep('success');
  };

  const handleClose = () => {
    setStep('form');
    setFormData({
      problemType: '',
      comment: '',
      photo: null,
      phone: ''
    });
    setPhotoPreview(null);
    setErrors({});
    onClose();
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      working: '✅ Работает',
      maintenance: '🟡 На обслуживании',
      problem: '❌ Есть проблема'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusClass = (status: string) => {
    const classMap = {
      working: styles.statusWorking,
      maintenance: styles.statusMaintenance,
      problem: styles.statusProblem
    };
    return classMap[status as keyof typeof classMap] || '';
  };

  const isAuth = localStorage.getItem('isAuth') === 'true';

  if (step === 'success') {
    return (
      <div className={styles.overlay} onClick={handleClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✅</div>
            <div className={styles.successTitle}>Спасибо!</div>
            <div className={styles.successText}>
              Ваша заявка на водомат по адресу:<br />
              <strong>{machine.address}</strong><br />
              принята. Мы уже начали её обрабатывать.
            </div>
            <div className={styles.successActions}>
              {isAuth ? (
                <button 
                  className={`${styles.successBtn} ${styles.primaryBtn}`}
                  onClick={() => {
                    alert('Переход в личный кабинет (будет реализовано позже)');
                    handleClose();
                  }}
                >
                  📋 Посмотреть статус
                </button>
              ) : (
                <button 
                  className={`${styles.successBtn} ${styles.primaryBtn}`}
                  onClick={() => {
                    alert('Открыть регистрацию (будет реализовано позже)');
                    handleClose();
                  }}
                >
                  📝 Зарегистрироваться
                </button>
              )}
              <button 
                className={`${styles.successBtn} ${styles.secondaryBtn}`}
                onClick={handleClose}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Сообщить о проблеме</h2>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div className={styles.machineInfo}>
          <div className={styles.machinePhoto}>📷</div>
          <div className={styles.machineDetails}>
            <div className={styles.machineAddress}>{machine.address}</div>
            <span className={`${styles.machineStatus} ${getStatusClass(machine.status)}`}>
              {getStatusText(machine.status)}
            </span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Тип проблемы *</label>
            <select
              name="problemType"
              value={formData.problemType}
              onChange={handleChange}
              className={`${styles.select} ${errors.problemType ? styles.error : ''}`}
            >
              <option value="">Выберите тип проблемы</option>
              {problemTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.problemType && <span className={styles.errorText}>{errors.problemType}</span>}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Комментарий</label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              className={styles.textarea}
              placeholder="Опишите проблему подробнее..."
              rows={4}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Фото</label>
            {!formData.photo ? (
              <div 
                className={styles.photoUpload}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
                <div className={styles.uploadIcon}>📸</div>
                <div className={styles.uploadText}>Нажмите, чтобы прикрепить фото</div>
                <div className={styles.uploadHint}>Максимум 5 МБ</div>
              </div>
            ) : (
              <div className={styles.photoPreview}>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className={styles.previewImage} />
                )}
                <div className={styles.previewInfo}>
                  {formData.photo.name}
                </div>
                <div 
                  className={styles.previewDelete}
                  onClick={handleRemovePhoto}
                >
                  Удалить
                </div>
              </div>
            )}
          </div>

          {!isAuth && (
            <div className={styles.phoneField}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Телефон для связи *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`${styles.input} ${errors.phone ? styles.error : ''}`}
                  placeholder="+7 (___) ___-__-__"
                />
                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              </div>
            </div>
          )}

          <button type="submit" className={styles.submitBtn}>
            Отправить заявку
          </button>
        </form>
      </div>
    </div>
  );
}

export default ComplaintModal;