import { useState, useEffect } from 'react';
import { inquiryApi, type InquiryDashboardStats, type InquiryStatsItem } from '../api';

type StatsTab = 'dashboard' | 'type' | 'method' | 'building' | 'status' | 'monthly' | 'weekly';

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<StatsTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardStats, setDashboardStats] = useState<InquiryDashboardStats | null>(null);
  const [typeStats, setTypeStats] = useState<InquiryStatsItem[]>([]);
  const [methodStats, setMethodStats] = useState<InquiryStatsItem[]>([]);
  const [buildingStats, setBuildingStats] = useState<InquiryStatsItem[]>([]);
  const [statusStats, setStatusStats] = useState<InquiryStatsItem[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<InquiryStatsItem[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<InquiryStatsItem[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        switch (activeTab) {
          case 'dashboard':
            const dashboard = await inquiryApi.getDashboardStats();
            setDashboardStats(dashboard);
            break;
          case 'type':
            const types = await inquiryApi.getTypeStats();
            setTypeStats(types);
            break;
          case 'method':
            const methods = await inquiryApi.getMethodStats();
            setMethodStats(methods);
            break;
          case 'building':
            const buildings = await inquiryApi.getBuildingStats();
            setBuildingStats(buildings);
            break;
          case 'status':
            const statuses = await inquiryApi.getStatusStats();
            setStatusStats(statuses);
            break;
          case 'monthly':
            const monthly = await inquiryApi.getMonthlyStats(selectedYear);
            setMonthlyStats(monthly);
            break;
          case 'weekly':
            const weekly = await inquiryApi.getWeeklyStatsInMonth(selectedYear, selectedMonth);
            setWeeklyStats(weekly);
            break;
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('통계를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [activeTab, selectedYear, selectedMonth]);

  useEffect(() => {
    let cancelled = false;
    const currentYear = new Date().getFullYear();
    if (selectedYear === currentYear) {
      setSelectedMonth(new Date().getMonth() + 1);
    } else {
      inquiryApi.getMonthlyStats(selectedYear).then(stats => {
        if (cancelled) return;
        if (stats.length > 0) {
          const month = parseInt(stats[0].label.split('-')[1], 10);
          setSelectedMonth(month);
        } else {
          setSelectedMonth(1);
        }
      }).catch(() => { if (!cancelled) setSelectedMonth(1); });
    }
    return () => { cancelled = true; };
  }, [selectedYear]);

  const renderLineChart = (
    stats: InquiryStatsItem[],
    title: string,
    subLabelFn?: (label: string) => string
  ) => {
    const svgWidth = 720;
    const hasSubLabel = !!subLabelFn;
    const svgHeight = hasSubLabel ? 340 : 300;
    const pl = 52, pr = 20, pt = 30;
    const pb = hasSubLabel ? 80 : 60;
    const cw = svgWidth - pl - pr;
    const ch = svgHeight - pt - pb;

    if (stats.length === 0) {
      return (
        <div className="stats-section">
          <h3>{title}</h3>
          <p className="empty-message">데이터가 없습니다.</p>
        </div>
      );
    }

    const maxCount = Math.max(...stats.map(s => s.count), 1);
    const n = stats.length;
    const getX = (i: number) => n === 1 ? pl + cw / 2 : pl + (i / (n - 1)) * cw;
    const getY = (count: number) => pt + ch - (count / maxCount) * ch;

    const pathD = stats.map((item, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(item.count).toFixed(1)}`
    ).join(' ');

    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
      Math.round((maxCount * i) / yTicks)
    );

    return (
      <div className="stats-section">
        <h3>{title}</h3>
        <div className="line-chart-wrap">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="line-chart">
            {/* Y grid + labels */}
            {yTickValues.map((val, i) => {
              const y = getY(val);
              return (
                <g key={i}>
                  <line x1={pl} y1={y} x2={pl + cw} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  <text x={pl - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{val}</text>
                </g>
              );
            })}
            {/* Axes */}
            <line x1={pl} y1={pt} x2={pl} y2={pt + ch} stroke="#9ca3af" strokeWidth="1.5" />
            <line x1={pl} y1={pt + ch} x2={pl + cw} y2={pt + ch} stroke="#9ca3af" strokeWidth="1.5" />
            {/* Area fill */}
            <path
              d={`${pathD} L ${getX(n - 1).toFixed(1)} ${(pt + ch).toFixed(1)} L ${getX(0).toFixed(1)} ${(pt + ch).toFixed(1)} Z`}
              fill="rgba(59,130,246,0.07)"
            />
            {/* Line */}
            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* Dots + labels */}
            {stats.map((item, i) => {
              const x = getX(i);
              const y = getY(item.count);
              const subLabel = subLabelFn ? subLabelFn(item.label) : undefined;
              const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
              return (
                <g key={i}>
                  {item.count > 0 && (
                    <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fill="#1f2937" fontWeight="600">
                      {item.count}건
                    </text>
                  )}
                  <circle cx={x} cy={y} r="4.5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                  <text x={x} y={pt + ch + 18} textAnchor={anchor} fontSize="11" fill="#374151">{item.label}</text>
                  {subLabel && (
                    <text x={x} y={pt + ch + 34} textAnchor={anchor} fontSize="10" fill="#6b7280">{subLabel}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const renderStatsTable = (stats: InquiryStatsItem[], title: string) => (
    <div className="stats-section">
      <h3>{title}</h3>
      {stats.length === 0 ? (
        <p className="empty-message">데이터가 없습니다.</p>
      ) : (
        <table className="stats-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>건수</th>
              <th>비율</th>
              <th>그래프</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((item, index) => (
              <tr key={index}>
                <td>{item.label}</td>
                <td className="stats-count">{item.count}건</td>
                <td className="stats-percentage">{item.percentage}%</td>
                <td className="stats-bar-cell">
                  <div className="stats-bar-container">
                    <div
                      className="stats-bar"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderDashboard = () => {
    if (!dashboardStats) return null;

    return (
      <div className="stats-dashboard">
        <div className="stats-summary">
          <div className="stats-card">
            <span className="stats-card-label">전체 민원</span>
            <span className="stats-card-value">{dashboardStats.totalCount}건</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">일평균</span>
            <span className="stats-card-value">{dashboardStats.avgDailyCount}건</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">월평균</span>
            <span className="stats-card-value">{dashboardStats.avgMonthlyCount}건</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">주평균</span>
            <span className="stats-card-value">{dashboardStats.avgWeeklyCount}건</span>
          </div>
        </div>

        <div className="stats-status-summary">
          <h3>상태별 현황</h3>
          <div className="status-cards">
            {Object.entries(dashboardStats.statusCounts).map(([status, count]) => (
              <div key={status} className="status-card">
                <span className="status-card-label">{status}</span>
                <span className="status-card-value">{count as number}건</span>
              </div>
            ))}
          </div>
        </div>

        {renderStatsTable(dashboardStats.typeCounts, '유형별 통계')}
        {renderStatsTable(dashboardStats.methodCounts, '처리방식별 통계')}
        {renderStatsTable(dashboardStats.buildingCounts, '건물별 통계')}
      </div>
    );
  };

  const tabs: { key: StatsTab; label: string }[] = [
    { key: 'dashboard', label: '대시보드' },
    { key: 'type', label: '유형별' },
    { key: 'method', label: '처리방식별' },
    { key: 'building', label: '건물별' },
    { key: 'status', label: '상태별' },
    { key: 'monthly', label: '월별' },
    { key: 'weekly', label: '주별' },
  ];

  return (
    <div className="page stats-page">
      <h1 className="page-title">민원 통계</h1>

      <div className="stats-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`stats-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === 'monthly' || activeTab === 'weekly') && (
        <div className="stats-year-selector">
          <label>연도: </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="form-select"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}년
                </option>
              );
            })}
          </select>
          {activeTab === 'weekly' && (
            <>
              <label style={{ marginLeft: '12px' }}>월: </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="form-select"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}월
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {loading && <div className="loading">로딩 중...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <div className="stats-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'type' && renderStatsTable(typeStats, '유형별 통계')}
          {activeTab === 'method' && renderStatsTable(methodStats, '처리방식별 통계')}
          {activeTab === 'building' && renderStatsTable(buildingStats, '건물별 통계')}
          {activeTab === 'status' && renderStatsTable(statusStats, '상태별 통계')}
          {activeTab === 'monthly' && renderLineChart(
            monthlyStats.map(s => ({ ...s, label: s.label.replace(/^\d{4}-0?(\d+)$/, '$1월') })),
            `${selectedYear}년 월별 통계`
          )}
          {activeTab === 'weekly' && renderLineChart(
            weeklyStats,
            `${selectedYear}년 ${selectedMonth}월 주별 통계`,
            (label) => {
              const match = label.match(/^(\d+)주차$/);
              if (!match) return '';
              const weekNum = parseInt(match[1]);
              // WEEK(date, 3) = ISO 8601 연간 주차 (월요일 시작)
              // ISO 주 1의 월요일: 1월 4일을 포함하는 주의 월요일
              const jan4 = new Date(selectedYear, 0, 4);
              const week1Monday = new Date(jan4);
              week1Monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
              const weekStart = new Date(week1Monday);
              weekStart.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              // 해당 월 범위로 클램프
              const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
              const monthEnd = new Date(selectedYear, selectedMonth, 0);
              const s = new Date(Math.max(weekStart.getTime(), monthStart.getTime()));
              const e = new Date(Math.min(weekEnd.getTime(), monthEnd.getTime()));
              return `${s.getMonth() + 1}/${s.getDate()}~${e.getDate()}일`;
            }
          )}
        </div>
      )}
    </div>
  );
}
