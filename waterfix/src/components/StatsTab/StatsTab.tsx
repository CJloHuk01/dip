import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import styles from './StatsTab.module.css';

const API_URL = 'http://localhost:5000/api';

interface StatsData {
  cards: {
    total: number;
    newCount: number;
    inProgress: number;
    resolvedThisMonth: number;
    resolvedPercent: number;
    avgResolutionHours: number;
  };
  byStatus: { name: string; value: number; color: string }[];
  byDay: { date: string; count: number }[];
  topMachines: { address: string; count: number }[];
}

function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (data.success) setStats(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Загрузка статистики...</div>;
  if (!stats) return <div className={styles.loading}>Нет данных</div>;

  const { cards, byStatus, byDay, topMachines } = stats;

  return (
    <div className={styles.stats}>

      {/* Карточки */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>📋</div>
          <div className={styles.cardValue}>{cards.total}</div>
          <div className={styles.cardLabel}>Всего заявок</div>
        </div>
        <div className={`${styles.card} ${styles.cardBlue}`}>
          <div className={styles.cardIcon}>🆕</div>
          <div className={styles.cardValue}>{cards.newCount}</div>
          <div className={styles.cardLabel}>Новых заявок</div>
        </div>
        <div className={`${styles.card} ${styles.cardYellow}`}>
          <div className={styles.cardIcon}>⚙️</div>
          <div className={styles.cardValue}>{cards.inProgress}</div>
          <div className={styles.cardLabel}>В работе</div>
        </div>
        <div className={`${styles.card} ${styles.cardGreen}`}>
          <div className={styles.cardIcon}>✅</div>
          <div className={styles.cardValue}>{cards.resolvedThisMonth}</div>
          <div className={styles.cardLabel}>Решено за месяц</div>
        </div>
        <div className={`${styles.card} ${styles.cardPurple}`}>
          <div className={styles.cardIcon}>📊</div>
          <div className={styles.cardValue}>{cards.resolvedPercent}%</div>
          <div className={styles.cardLabel}>Процент решённых</div>
        </div>
        <div className={`${styles.card} ${styles.cardOrange}`}>
          <div className={styles.cardIcon}>⏱️</div>
          <div className={styles.cardValue}>{cards.avgResolutionHours} ч</div>
          <div className={styles.cardLabel}>Среднее время решения</div>
        </div>
      </div>

      {/* Графики */}
      <div className={styles.charts}>

        {/* Круговая — по статусам */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>📊 Заявки по статусам</div>
          {byStatus.every(s => s.value === 0) ? (
            <div className={styles.noData}>Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={byStatus.filter(s => s.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {byStatus.filter(s => s.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val} шт.`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Линейный — по дням */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>📈 Заявки за последние 30 дней</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval={4}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val) => [`${val} шт.`, 'Заявок']}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Горизонтальный бар — топ водоматов */}
        <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
          <div className={styles.chartTitle}>🏆 Топ водоматов по заявкам</div>
          {topMachines.length === 0 ? (
            <div className={styles.noData}>Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topMachines}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="address"
                  tick={{ fontSize: 11 }}
                  width={160}
                />
                <Tooltip formatter={(val) => [`${val} шт.`, 'Заявок']} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}

export default StatsTab;
