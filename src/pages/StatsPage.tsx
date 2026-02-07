import { useState, useEffect } from 'react';
import { inquiryApi, type InquiryDashboardStats, type InquiryStatsItem } from '../api';

type StatsTab = 'dashboard' | 'type' | 'method' | 'building' | 'status' | 'monthly';

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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('통계를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [activeTab, selectedYear]);

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
            <span className="stats-card-label">평균 처리일</span>
            <span className="stats-card-value">
              {dashboardStats.avgProcessingDays !== null ? `${dashboardStats.avgProcessingDays}일` : '-'}
            </span>
          </div>
        </div>

        <div className="stats-status-summary">
          <h3>상태별 현황</h3>
          <div className="status-cards">
            {Object.entries(dashboardStats.statusCounts).map(([status, count]) => (
              <div key={status} className="status-card">
                <span className="status-card-label">{status}</span>
                <span className="status-card-value">{count}건</span>
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

      {activeTab === 'monthly' && (
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
          {activeTab === 'monthly' && renderStatsTable(monthlyStats, `${selectedYear}년 월별 통계`)}
        </div>
      )}
    </div>
  );
}
