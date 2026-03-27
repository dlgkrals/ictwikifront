import { useState, useEffect, useRef } from 'react';

export type PickerMode = 'yearly' | 'monthly' | 'weekly';

interface YearMonthPickerProps {
  mode: PickerMode;
  year: number;
  month: number | null;
  week?: number | null;
  withWeek?: boolean;
  hideModes?: boolean;
  onModeChange: (mode: PickerMode) => void;
  onChange: (year: number, month: number | null, week?: number | null) => void;
}

// 백엔드 고정 4주 분할: 1주(1-7일), 2주(8-14일), 3주(15-21일), 4주(22일-말일)
export function getWeeksInMonth(_year: number, _month: number): number[] {
  return [1, 2, 3, 4];
}

export default function YearMonthPicker({
  mode, year, month, week, withWeek, hideModes, onModeChange, onChange,
}: YearMonthPickerProps) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [localMode, setLocalMode] = useState<PickerMode>(mode);
  const [view, setView] = useState<'year' | 'month' | 'week'>('year');
  const [yearPageStart, setYearPageStart] = useState(() => Math.floor(year / 6) * 6);
  const [pendingYear, setPendingYear] = useState(year);
  const [pendingMonth, setPendingMonth] = useState(month ?? now.getMonth() + 1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleOpen = () => {
    setYearPageStart(Math.floor(year / 6) * 6);
    setPendingYear(year);
    setPendingMonth(month ?? now.getMonth() + 1);
    setLocalMode(mode);
    setView('year');
    setOpen(true);
  };

  const handleModeChange = (newMode: PickerMode) => {
    setLocalMode(newMode);
    onModeChange(newMode);

    if (newMode === 'yearly') {
      // 현재 연도만 남기고 즉시 적용
      onChange(year, null, null);
      setOpen(false);
      return;
    }

    if (newMode === 'monthly') {
      if (week != null && month !== null) {
        // 주별→월별: 연도+월 유지, 주만 제거 후 즉시 적용
        onChange(year, month, null);
        setOpen(false);
        return;
      }
      // 연별→월별: 연도 선택 스킵, 바로 월 그리드
      setPendingYear(year);
      setYearPageStart(Math.floor(year / 6) * 6);
      setView('month');
      return;
    }

    // weekly
    if (month !== null) {
      // 월별→주별: 연도+월 선택 스킵, 바로 주 그리드
      setPendingYear(year);
      setPendingMonth(month);
      setView('week');
      return;
    }
    // 연별→주별: 연도는 이미 선택됨, 월 선택으로 바로
    setPendingYear(year);
    setYearPageStart(Math.floor(year / 6) * 6);
    setView('month');
  };

  const handleYearClick = (y: number) => {
    if (localMode === 'yearly') {
      onChange(y, null, null);
      setOpen(false);
    } else {
      setPendingYear(y);
      setView('month');
    }
  };

  const handleMonthClick = (m: number) => {
    if (localMode === 'monthly') {
      onChange(pendingYear, m, null);
      setOpen(false);
    } else {
      setPendingMonth(m);
      setView('week');
    }
  };

  const handleWeekClick = (w: number) => {
    onChange(pendingYear, pendingMonth, w);
    setOpen(false);
  };

  const handlePrev = () => {
    if (week != null && month !== null) {
      const weeks = getWeeksInMonth(year, month);
      const idx = weeks.indexOf(week);
      if (idx > 0) {
        onChange(year, month, weeks[idx - 1]);
      } else {
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevWeeks = getWeeksInMonth(prevYear, prevMonth);
        onChange(prevYear, prevMonth, prevWeeks[prevWeeks.length - 1]);
      }
    } else if (month !== null) {
      if (month === 1) onChange(year - 1, 12, null);
      else onChange(year, month - 1, null);
    } else {
      onChange(year - 1, null, null);
    }
  };

  const handleNext = () => {
    if (week != null && month !== null) {
      const weeks = getWeeksInMonth(year, month);
      const idx = weeks.indexOf(week);
      if (idx < weeks.length - 1) {
        onChange(year, month, weeks[idx + 1]);
      } else {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const nextWeeks = getWeeksInMonth(nextYear, nextMonth);
        onChange(nextYear, nextMonth, nextWeeks[0]);
      }
    } else if (month !== null) {
      if (month === 12) onChange(year + 1, 1, null);
      else onChange(year, month + 1, null);
    } else {
      onChange(year + 1, null, null);
    }
  };

  const weekPosition = week != null && month !== null
    ? getWeeksInMonth(year, month).indexOf(week) + 1
    : null;

  const displayLabel = week != null && month !== null
    ? `${year}년 ${month}월 ${weekPosition}주차`
    : month !== null
    ? `${year}년 ${month}월`
    : `${year}년`;

  const years = Array.from({ length: 6 }, (_, i) => yearPageStart + i);
  const pendingWeeks = getWeeksInMonth(pendingYear, pendingMonth);

  return (
    <div className="ymp-wrap" ref={wrapRef}>
      <button className="ymp-arrow-btn" onClick={handlePrev}>&#9664;</button>
      <button className="ymp-display" onClick={handleOpen}>{displayLabel}</button>
      <button className="ymp-arrow-btn" onClick={handleNext}>&#9654;</button>

      {open && (
        <div className="ymp-popup">
          {!hideModes && (
            <div className="ymp-mode-tabs">
              <button
                className={`ymp-mode-tab${localMode === 'yearly' ? ' active' : ''}`}
                onClick={() => handleModeChange('yearly')}
              >
                연별
              </button>
              <button
                className={`ymp-mode-tab${localMode === 'monthly' ? ' active' : ''}`}
                onClick={() => handleModeChange('monthly')}
              >
                월별
              </button>
              {withWeek && (
                <button
                  className={`ymp-mode-tab${localMode === 'weekly' ? ' active' : ''}`}
                  onClick={() => handleModeChange('weekly')}
                >
                  주별
                </button>
              )}
            </div>
          )}

          {view === 'year' && (
            <>
              <div className="ymp-year-nav">
                <button className="ymp-nav-btn" onClick={() => setYearPageStart(s => s - 6)}>&#9664;</button>
                <span className="ymp-year-nav-label">{yearPageStart} – {yearPageStart + 5}</span>
                <button className="ymp-nav-btn" onClick={() => setYearPageStart(s => s + 6)}>&#9654;</button>
              </div>
              <div className="ymp-grid">
                {years.map(y => (
                  <button
                    key={y}
                    className={[
                      'ymp-grid-item',
                      y === year ? 'selected' : '',
                      y === now.getFullYear() && y !== year ? 'current' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleYearClick(y)}
                  >
                    {y}년
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'month' && (
            <>
              <div className="ymp-month-header">
                <button className="ymp-back-btn" onClick={() => setView('year')}>
                  &#9666; 연도
                </button>
                <span className="ymp-month-header-year">{pendingYear}년</span>
              </div>
              <div className="ymp-grid">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <button
                    key={m}
                    className={[
                      'ymp-grid-item',
                      m === month && pendingYear === year ? 'selected' : '',
                      m === now.getMonth() + 1 && pendingYear === now.getFullYear() && !(m === month && pendingYear === year) ? 'current' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleMonthClick(m)}
                  >
                    {m}월
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'week' && (
            <>
              <div className="ymp-month-header">
                <button className="ymp-back-btn" onClick={() => setView('month')}>
                  &#9666; 월
                </button>
                <span className="ymp-month-header-year">{pendingYear}년 {pendingMonth}월</span>
              </div>
              <div className="ymp-grid">
                {pendingWeeks.map((w, idx) => (
                  <button
                    key={w}
                    className={[
                      'ymp-grid-item',
                      w === week && pendingYear === year && pendingMonth === month ? 'selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleWeekClick(w)}
                  >
                    {idx + 1}주차
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
