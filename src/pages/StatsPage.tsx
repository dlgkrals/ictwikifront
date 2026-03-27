import { useState, useEffect } from 'react';
import { inquiryApi, type InquiryDashboardStats, type InquiryStatsItem } from '../api';
import YearMonthPicker, { type PickerMode, getWeeksInMonth } from '../components/YearMonthPicker';

type StatsTab = 'dashboard' | 'monthly';

export default function StatsPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<StatsTab>('dashboard');

  // ── 글로벌 필터 (summary 카드 기준 + 섹션 기본값) ──
  const [globalYear, setGlobalYear] = useState(now.getFullYear());
  const [globalMonth, setGlobalMonth] = useState<number | null>(null);
  const [globalWeek, setGlobalWeek] = useState<number | null>(null);

  // ── 요약 카드 ──
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dashSummary, setDashSummary] = useState<InquiryDashboardStats | null>(null);

  // ── 섹션별 독립 필터 (글로벌 기본값에서 오버라이드 가능) ──
  const [statusYear, setStatusYear] = useState(now.getFullYear());
  const [statusMonth, setStatusMonth] = useState<number | null>(null);
  const [statusWeek, setStatusWeek] = useState<number | null>(null);
  const [typeYear, setTypeYear] = useState(now.getFullYear());
  const [typeMonth, setTypeMonth] = useState<number | null>(null);
  const [typeWeek, setTypeWeek] = useState<number | null>(null);
  const [methodYear, setMethodYear] = useState(now.getFullYear());
  const [methodMonth, setMethodMonth] = useState<number | null>(null);
  const [methodWeek, setMethodWeek] = useState<number | null>(null);
  const [buildingYear, setBuildingYear] = useState(now.getFullYear());
  const [buildingMonth, setBuildingMonth] = useState<number | null>(null);
  const [buildingWeek, setBuildingWeek] = useState<number | null>(null);

  // ── 섹션별 데이터 & 로딩 ──
  const [statusStats, setStatusStats] = useState<InquiryStatsItem[]>([]);
  const [typeStats, setTypeStats] = useState<InquiryStatsItem[]>([]);
  const [methodStats, setMethodStats] = useState<InquiryStatsItem[]>([]);
  const [buildingStats, setBuildingStats] = useState<InquiryStatsItem[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [typeLoading, setTypeLoading] = useState(false);
  const [methodLoading, setMethodLoading] = useState(false);
  const [buildingLoading, setBuildingLoading] = useState(false);

  // ── 건수 추이 탭 ──
  const [trendView, setTrendView] = useState<'monthly' | 'weekly'>('monthly');
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<InquiryStatsItem[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<InquiryStatsItem[]>([]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // 연간 요약 카드 fetch
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setSummaryLoading(true);
    inquiryApi.getDashboardStats(globalYear, globalMonth ?? undefined, globalWeek ?? undefined)
      .then(setDashSummary)
      .catch(() => setDashSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [activeTab, globalYear, globalMonth, globalWeek]);

  // 상태별
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setStatusLoading(true);
    inquiryApi.getStatusStats(statusYear, statusMonth ?? undefined, statusWeek ?? undefined)
      .then(setStatusStats)
      .catch(() => setStatusStats([]))
      .finally(() => setStatusLoading(false));
  }, [activeTab, statusYear, statusMonth, statusWeek]);

  // 유형별
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setTypeLoading(true);
    inquiryApi.getTypeStats(typeYear, typeMonth ?? undefined, typeWeek ?? undefined)
      .then(setTypeStats)
      .catch(() => setTypeStats([]))
      .finally(() => setTypeLoading(false));
  }, [activeTab, typeYear, typeMonth, typeWeek]);

  // 처리방식별
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setMethodLoading(true);
    inquiryApi.getMethodStats(methodYear, methodMonth ?? undefined, methodWeek ?? undefined)
      .then(setMethodStats)
      .catch(() => setMethodStats([]))
      .finally(() => setMethodLoading(false));
  }, [activeTab, methodYear, methodMonth, methodWeek]);

  // 건물별
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    setBuildingLoading(true);
    inquiryApi.getBuildingStats(buildingYear, buildingMonth ?? undefined, buildingWeek ?? undefined)
      .then(setBuildingStats)
      .catch(() => setBuildingStats([]))
      .finally(() => setBuildingLoading(false));
  }, [activeTab, buildingYear, buildingMonth, buildingWeek]);

  // 월별 통계 fetch
  useEffect(() => {
    if (activeTab !== 'monthly' || trendView !== 'monthly') return;
    setMonthlyLoading(true);
    inquiryApi.getMonthlyStats(selectedYear)
      .then(setMonthlyStats)
      .catch(() => setMonthlyStats([]))
      .finally(() => setMonthlyLoading(false));
  }, [activeTab, selectedYear, trendView]);

  // 주별 통계 fetch (연간 전체: 현재 연도는 현재 월까지, 과거 연도는 12개월)
  useEffect(() => {
    if (activeTab !== 'monthly' || trendView !== 'weekly') return;
    setWeeklyLoading(true);
    const maxMonth = selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;
    Promise.all(
      Array.from({ length: maxMonth }, (_, i) =>
        inquiryApi.getWeeklyStatsInMonth(selectedYear, i + 1)
      )
    )
      .then(results => setWeeklyStats(results.flat()))
      .catch(() => setWeeklyStats([]))
      .finally(() => setWeeklyLoading(false));
  }, [activeTab, selectedYear, trendView]);

  // 글로벌 연/월/주 변경 → 모든 섹션 동기화
  const handleGlobalPickerChange = (year: number, month: number | null, week?: number | null) => {
    const w = week ?? null;
    setGlobalYear(year);
    setGlobalMonth(month);
    setGlobalWeek(w);
    setStatusYear(year); setStatusMonth(month); setStatusWeek(w);
    setTypeYear(year);   setTypeMonth(month);   setTypeWeek(w);
    setMethodYear(year); setMethodMonth(month); setMethodWeek(w);
    setBuildingYear(year); setBuildingMonth(month); setBuildingWeek(w);
  };

  // 섹션 연/월/주 변경 핸들러 팩토리
  const makeSectionPickerHandler = (
    setYear: (y: number) => void,
    setMonth: (m: number | null) => void,
    setWeek: (w: number | null) => void,
  ) => (year: number, month: number | null, week?: number | null) => {
    setYear(year);
    setMonth(month);
    setWeek(week ?? null);
  };

  // ── 도넛 차트 (상태별, 처리방식별) ──
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899'];

  const renderDonutChart = (stats: InquiryStatsItem[]) => {
    if (stats.length === 0) return <p className="empty-message">데이터가 없습니다.</p>;
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const cx = 100, cy = 100, r = 82, ir = 52;
    let angle = -Math.PI / 2;
    const slices = stats.map((item, i) => {
      const sweep = (item.count / total) * 2 * Math.PI;
      const fullCircle = sweep >= 2 * Math.PI - 0.0001;
      const sa = angle, ea = angle + sweep;
      angle = ea;
      const color = CHART_COLORS[i % CHART_COLORS.length];
      if (fullCircle) return { fullCircle: true as const, color, d: '' };
      const large = sweep > Math.PI ? 1 : 0;
      const d = [
        `M ${(cx + r * Math.cos(sa)).toFixed(2)} ${(cy + r * Math.sin(sa)).toFixed(2)}`,
        `A ${r} ${r} 0 ${large} 1 ${(cx + r * Math.cos(ea)).toFixed(2)} ${(cy + r * Math.sin(ea)).toFixed(2)}`,
        `L ${(cx + ir * Math.cos(ea)).toFixed(2)} ${(cy + ir * Math.sin(ea)).toFixed(2)}`,
        `A ${ir} ${ir} 0 ${large} 0 ${(cx + ir * Math.cos(sa)).toFixed(2)} ${(cy + ir * Math.sin(sa)).toFixed(2)}`,
        'Z',
      ].join(' ');
      return { fullCircle: false as const, color, d };
    });
    return (
      <div className="donut-wrap">
        <svg viewBox="0 0 200 200" className="donut-svg">
          {slices.map((s, i) =>
            s.fullCircle ? (
              <g key={i}>
                <circle cx={cx} cy={cy} r={r} fill={s.color} />
                <circle cx={cx} cy={cy} r={ir} fill="white" />
              </g>
            ) : (
              <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="2" />
            )
          )}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">건</text>
        </svg>
        <div className="donut-legend">
          {stats.map((item, i) => (
            <div key={i} className="donut-legend-item">
              <span className="donut-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="donut-legend-label">{item.label}</span>
              <span className="donut-legend-count">{item.count}건</span>
              <span className="donut-legend-pct">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── 가로 막대 차트 (유형별, 건물별) ──
  const renderHorizontalBar = (stats: InquiryStatsItem[]) => {
    if (stats.length === 0) return <p className="empty-message">데이터가 없습니다.</p>;
    return (
      <div className="hbar-chart">
        {stats.map((item, i) => (
          <div key={i} className="hbar-row">
            <span className="hbar-label">{item.label}</span>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${item.percentage}%` }} />
            </div>
            <span className="hbar-count">{item.count}건</span>
            <span className="hbar-pct">{item.percentage}%</span>
          </div>
        ))}
      </div>
    );
  };

  // ── 섹션 (헤더 + 필터 + 차트) ──
  const renderSection = (
    title: string,
    stats: InquiryStatsItem[],
    loading: boolean,
    year: number,
    month: number | null,
    week: number | null,
    onPickerChange: (y: number, m: number | null, w?: number | null) => void,
    chartType: 'donut' | 'hbar' = 'hbar',
  ) => {
    const availWeeks = month !== null ? getWeeksInMonth(year, month) : [];
    const weekPosition = week !== null ? availWeeks.indexOf(week) + 1 : null;
    const periodLabel = week !== null && month !== null
      ? `${year}년 ${month}월 ${weekPosition}주차`
      : month !== null
      ? `${year}년 ${month}월`
      : `${year}년 전체`;
    const pickerMode: PickerMode = week !== null ? 'weekly' : month !== null ? 'monthly' : 'yearly';

    return (
      <div className="stats-section">
        <div className="stats-section-head">
          <h3>
            {title}
            <span className="stats-section-period">{periodLabel}</span>
          </h3>
          <div className="stats-section-filter">
            <YearMonthPicker
              withWeek
              mode={pickerMode}
              year={year}
              month={month}
              week={week}
              onModeChange={() => {}}
              onChange={onPickerChange}
            />
          </div>
        </div>
        {loading
          ? <p className="stats-section-loading">로딩 중...</p>
          : chartType === 'donut' ? renderDonutChart(stats) : renderHorizontalBar(stats)
        }
      </div>
    );
  };

  // ── 라인 차트 ──
  const renderLineChart = (
    stats: InquiryStatsItem[],
    title: string,
    subLabelFn?: (label: string) => string,
    weeklyMode?: boolean
  ) => {
    const n = stats.length;
    const isWeeklyMode = weeklyMode ?? n > 15;
    const svgWidth = Math.max(720, isWeeklyMode ? n * 30 : n * 20);
    const hasSubLabel = !!subLabelFn;
    const svgHeight = hasSubLabel ? 340 : 300;
    const pl = 52, pr = 20, pt = 30;
    const pb = isWeeklyMode ? 75 : hasSubLabel ? 80 : 60;
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
    const getX = (i: number) => n === 1 ? pl + cw / 2 : pl + (i / (n - 1)) * cw;
    const getY = (count: number) => pt + ch - (count / maxCount) * ch;

    const pathD = stats.map((item, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(item.count).toFixed(1)}`
    ).join(' ');

    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
      Math.round((maxCount * i) / yTicks)
    );

    // 주별 모드: "N월 M주" 파싱
    const parseWeeklyLabel = (label: string) => {
      const m = label.match(/^(\d+)월 (\d+)주$/);
      return m ? { monthNum: parseInt(m[1]), weekNum: parseInt(m[2]) } : null;
    };

    return (
      <div className="stats-section">
        <h3>{title}</h3>
        <div className="line-chart-wrap">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="line-chart" style={{ width: '100%', minWidth: svgWidth }}>
            {yTickValues.map((val, i) => {
              const y = getY(val);
              return (
                <g key={i}>
                  <line x1={pl} y1={y} x2={pl + cw} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  <text x={pl - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{val}</text>
                </g>
              );
            })}
            <line x1={pl} y1={pt} x2={pl} y2={pt + ch} stroke="#9ca3af" strokeWidth="1.5" />
            <line x1={pl} y1={pt + ch} x2={pl + cw} y2={pt + ch} stroke="#9ca3af" strokeWidth="1.5" />
            <path
              d={`${pathD} L ${getX(n - 1).toFixed(1)} ${(pt + ch).toFixed(1)} L ${getX(0).toFixed(1)} ${(pt + ch).toFixed(1)} Z`}
              fill="rgba(59,130,246,0.07)"
            />
            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* 주별 모드: 월 경계 구분선 */}
            {isWeeklyMode && stats.map((item, i) => {
              const parsed = parseWeeklyLabel(item.label);
              if (!parsed || parsed.weekNum !== 1 || i === 0) return null;
              const x = getX(i);
              const prevX = getX(i - 1);
              const sepX = (x + prevX) / 2;
              return (
                <line
                  key={`sep-${i}`}
                  x1={sepX} y1={pt}
                  x2={sepX} y2={pt + ch + (isWeeklyMode ? 60 : 0)}
                  stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 3"
                />
              );
            })}
            {stats.map((item, i) => {
              const x = getX(i);
              const y = getY(item.count);
              const subLabel = subLabelFn ? subLabelFn(item.label) : undefined;
              const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';

              if (isWeeklyMode) {
                const parsed = parseWeeklyLabel(item.label);
                const isMonthStart = parsed?.weekNum === 1;
                return (
                  <g key={i}>
                    {item.count > 0 && (
                      <text x={x} y={y - 8} textAnchor="middle" fontSize="10" fill="#1f2937" fontWeight="600">
                        {item.count}건
                      </text>
                    )}
                    <circle cx={x} cy={y} r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                    {/* 주차 번호 (1주~4주) */}
                    <text x={x} y={pt + ch + 16} textAnchor="middle" fontSize="9" fill="#9ca3af">
                      {parsed ? `${parsed.weekNum}주` : item.label}
                    </text>
                    {/* 월 라벨: 각 월의 첫 주 아래에만 표시 */}
                    {isMonthStart && parsed && (
                      <text x={x} y={pt + ch + 34} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
                        {parsed.monthNum}월
                      </text>
                    )}
                  </g>
                );
              }

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

  const tabs: { key: StatsTab; label: string }[] = [
    { key: 'dashboard', label: '대시보드' },
    { key: 'monthly', label: '기간별 민원 분포' },
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

      {activeTab === 'dashboard' && (
        <div className="stats-dashboard">
          {/* 연도/월 선택 + 요약 카드 */}
          <div>
            <div className="stats-global-picker">
              <YearMonthPicker
                withWeek
                mode={globalWeek !== null ? 'weekly' : globalMonth !== null ? 'monthly' : 'yearly'}
                year={globalYear}
                month={globalMonth}
                week={globalWeek}
                onModeChange={() => {}}
                onChange={handleGlobalPickerChange}
              />
              <div className="stats-quick-btns">
                {(() => {
                  const currentWeek = now.getDate() < 8 ? 1 : now.getDate() < 15 ? 2 : now.getDate() < 22 ? 3 : 4;
                  const isThisMonth = globalYear === now.getFullYear() && globalMonth === now.getMonth() + 1 && globalWeek === null;
                  const isThisWeek = globalYear === now.getFullYear() && globalMonth === now.getMonth() + 1 && globalWeek === currentWeek;
                  return (
                    <>
                      <button
                        className={`stats-quick-btn${isThisMonth ? ' active' : ''}`}
                        onClick={() => handleGlobalPickerChange(now.getFullYear(), now.getMonth() + 1, null)}
                      >
                        이번달
                      </button>
                      <button
                        className={`stats-quick-btn${isThisWeek ? ' active' : ''}`}
                        onClick={() => handleGlobalPickerChange(now.getFullYear(), now.getMonth() + 1, currentWeek)}
                      >
                        이번주
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
            {summaryLoading ? (
              <p className="loading">로딩 중...</p>
            ) : dashSummary && (
              <div className="stats-summary">
                {dashSummary.currentWeekCount !== null ? (
                  // 당주 모드
                  <>
                    <div className="stats-card">
                      <span className="stats-card-label">{globalYear}년 전체</span>
                      <span className="stats-card-value">{dashSummary.totalCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">{globalMonth}월 건수</span>
                      <span className="stats-card-value">{dashSummary.currentMonthCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">{globalWeek}주차 건수</span>
                      <span className="stats-card-value">{dashSummary.currentWeekCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">일평균</span>
                      <span className="stats-card-value">{dashSummary.avgDailyCount}건</span>
                    </div>
                  </>
                ) : dashSummary.currentMonthCount !== null ? (
                  // 당월 모드
                  <>
                    <div className="stats-card">
                      <span className="stats-card-label">{globalYear}년 전체</span>
                      <span className="stats-card-value">{dashSummary.totalCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">{globalMonth}월 건수</span>
                      <span className="stats-card-value">{dashSummary.currentMonthCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">일평균</span>
                      <span className="stats-card-value">{dashSummary.avgDailyCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">주평균</span>
                      <span className="stats-card-value">{dashSummary.avgWeeklyCount}건</span>
                    </div>
                  </>
                ) : (
                  // 연도 모드
                  <>
                    <div className="stats-card">
                      <span className="stats-card-label">전체 민원</span>
                      <span className="stats-card-value">{dashSummary.totalCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">월평균</span>
                      <span className="stats-card-value">{dashSummary.avgMonthlyCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">주평균</span>
                      <span className="stats-card-value">{dashSummary.avgWeeklyCount}건</span>
                    </div>
                    <div className="stats-card">
                      <span className="stats-card-label">일평균</span>
                      <span className="stats-card-value">{dashSummary.avgDailyCount}건</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="stats-sections-grid">
            {renderSection(
              '상태별', statusStats, statusLoading,
              statusYear, statusMonth, statusWeek,
              makeSectionPickerHandler(setStatusYear, setStatusMonth, setStatusWeek),
              'donut',
            )}
            {renderSection(
              '유형별', typeStats, typeLoading,
              typeYear, typeMonth, typeWeek,
              makeSectionPickerHandler(setTypeYear, setTypeMonth, setTypeWeek),
              'hbar',
            )}
            {renderSection(
              '처리방식별', methodStats, methodLoading,
              methodYear, methodMonth, methodWeek,
              makeSectionPickerHandler(setMethodYear, setMethodMonth, setMethodWeek),
              'donut',
            )}
            {renderSection(
              '건물별', buildingStats, buildingLoading,
              buildingYear, buildingMonth, buildingWeek,
              makeSectionPickerHandler(setBuildingYear, setBuildingMonth, setBuildingWeek),
              'hbar',
            )}
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <>
          <div className="trend-header">
            <YearMonthPicker
              hideModes
              mode="yearly"
              year={selectedYear}
              month={null}
              onModeChange={() => {}}
              onChange={(y) => setSelectedYear(y)}
            />
            <div className="trend-toggle">
              <button
                className={`trend-toggle-btn${trendView === 'monthly' ? ' active' : ''}`}
                onClick={() => setTrendView('monthly')}
              >
                월별
              </button>
              <button
                className={`trend-toggle-btn${trendView === 'weekly' ? ' active' : ''}`}
                onClick={() => setTrendView('weekly')}
              >
                주별
              </button>
            </div>
          </div>

          {trendView === 'monthly' ? (
            monthlyLoading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              renderLineChart(
                monthlyStats.map(s => ({ ...s, label: s.label.replace(/^\d{4}-0?(\d+)$/, '$1월') })),
                `${selectedYear}년 월별 건수`
              )
            )
          ) : (
            weeklyLoading ? (
              <div className="loading">로딩 중...</div>
            ) : (
              renderLineChart(weeklyStats, `${selectedYear}년 주별 건수`, undefined, true)
            )
          )}
        </>
      )}
    </div>
  );
}
