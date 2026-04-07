import { useState, useEffect, useMemo, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { authApi, documentApi, inquiryApi, reportApi } from '../api';
import type { DocumentSummary, Inquiry, LocationResponse } from '../types';
import { INQUIRY_STATUS_MAP, INQUIRY_TYPE_MAP, INQUIRY_METHOD_MAP } from '../types';
import '../styles/mypagestyle.css';

type MyPageTab = 'info' | 'password' | 'documents' | 'inquiries';

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}초 전`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}달 전`;
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}년 전`;
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes().toString().padStart(2, '0');
  if (year === currentYear) {
    return `${month}월 ${day}일 ${hour}시 ${minute}분`;
  }
  return `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분`;
}

function formatRoomParts(locs: LocationResponse[]): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < locs.length) {
    const loc = locs[i];
    if (loc.roomNumber != null && !loc.roomName) {
      let j = i + 1;
      while (j < locs.length && locs[j].roomNumber != null && !locs[j].roomName && locs[j].roomNumber === locs[j - 1].roomNumber! + 1) {
        j++;
      }
      if (j - i === 1) {
        parts.push(`${loc.roomNumber}호`);
      } else {
        parts.push(`${loc.roomNumber}~${locs[j - 1].roomNumber}호`);
      }
      i = j;
    } else {
      if (loc.roomNumber != null && loc.roomName) parts.push(`${loc.roomNumber}호 ${loc.roomName}`);
      else if (loc.roomNumber != null) parts.push(`${loc.roomNumber}호`);
      else parts.push(loc.roomName || '');
      i++;
    }
  }
  return parts;
}

function formatLocationGroups(locations: LocationResponse[]): string[] {
  if (locations.length === 0) return [];
  const order: string[] = [];
  const grouped = new Map<string, LocationResponse[]>();
  for (const loc of locations) {
    if (!grouped.has(loc.buildingCode)) {
      order.push(loc.buildingCode);
      grouped.set(loc.buildingCode, []);
    }
    grouped.get(loc.buildingCode)!.push(loc);
  }
  return order.map((code) => {
    const locs = grouped.get(code)!.slice().sort((a, b) => {
      if (a.roomNumber != null && b.roomNumber != null) return a.roomNumber - b.roomNumber;
      if (a.roomNumber != null) return -1;
      if (b.roomNumber != null) return 1;
      return (a.roomName || '').localeCompare(b.roomName || '');
    });
    if (locs.length === 1) return locs[0].formatted;
    const buildingName = locs[0].buildingName;
    return `${buildingName} ${formatRoomParts(locs).join(', ')}`;
  });
}

/* ── Nav Icons ── */
const IconInfo = () => (
  <svg className="mp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLock = () => (
  <svg className="mp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconFile = () => (
  <svg className="mp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconClipboard = () => (
  <svg className="mp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

export default function MyPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { currentUser, getRoleLabel } = useWiki();

  const activeTab: MyPageTab = (tab as MyPageTab) || 'info';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [myDocuments, setMyDocuments] = useState<DocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const [myInquiries, setMyInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expandedInquiryId, setExpandedInquiryId] = useState<number | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);

  const displayedInquiries = useMemo(() => {
    if (!todayOnly) return myInquiries;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);
    return myInquiries.filter((inq) => {
      const createdAt = new Date(inq.createdAt);
      return createdAt >= todayStart && createdAt < todayEnd;
    });
  }, [myInquiries, todayOnly]);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchMyDocuments();
    } else if (activeTab === 'inquiries') {
      fetchMyInquiries();
    }
  }, [activeTab]);

  const fetchMyDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const docs = await documentApi.getMyDocuments();
      setMyDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch my documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchMyInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const inquiries = await inquiryApi.getMyAssigned();
      setMyInquiries(inquiries);
    } catch (error) {
      console.error('Failed to fetch my inquiries:', error);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    setReportDownloading(true);
    try {
      await reportApi.downloadDailyReport(reportDate);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('업무 일지 다운로드에 실패했습니다.');
    } finally {
      setReportDownloading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setPasswordError(axiosError.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordInput = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value.replace(/[^\x20-\x7E]/g, ''));
  };

  const menuItems = [
    { key: 'info',      label: '개인정보 조회',   path: '/my/info',      icon: <IconInfo /> },
    { key: 'password',  label: '비밀번호 변경',   path: '/my/password',  icon: <IconLock /> },
    { key: 'documents', label: '내가 쓴 문서',    path: '/my/documents', icon: <IconFile /> },
    { key: 'inquiries', label: '내가 처리한 민원', path: '/my/inquiries', icon: <IconClipboard /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div>
            <h2 className="mp-section-title">개인정보</h2>
            <p className="mp-section-desc">등록된 계정 정보입니다</p>
            <div className="mp-info-card">
              <div className="mp-info-row">
                <span className="mp-info-label">이름</span>
                <span className="mp-info-value">{currentUser?.name}</span>
              </div>
              <div className="mp-info-row">
                <span className="mp-info-label">이메일</span>
                <span className="mp-info-value">{currentUser?.email}</span>
              </div>
              <div className="mp-info-row">
                <span className="mp-info-label">역할</span>
                <span className="mp-info-value">
                  <span className="mp-role-badge">
                    {currentUser?.role ? getRoleLabel(currentUser.role) : ''}
                  </span>
                </span>
              </div>
            </div>
          </div>
        );

      case 'password':
        return (
          <div>
            <h2 className="mp-section-title">비밀번호 변경</h2>
            <p className="mp-section-desc">현재 비밀번호를 확인 후 변경할 수 있습니다</p>
            <div className="mp-form-card">
              <form onSubmit={handlePasswordChange}>
                {passwordError && <div className="mp-message mp-message-error">{passwordError}</div>}
                {passwordSuccess && <div className="mp-message mp-message-success">{passwordSuccess}</div>}
                <div className="mp-field">
                  <label className="mp-label">현재 비밀번호</label>
                  <input
                    type="password"
                    className="mp-input"
                    value={currentPassword}
                    onChange={handlePasswordInput(setCurrentPassword)}
                    disabled={isChangingPassword}
                  />
                </div>
                <div className="mp-field">
                  <label className="mp-label">새 비밀번호</label>
                  <input
                    type="password"
                    className="mp-input"
                    value={newPassword}
                    onChange={handlePasswordInput(setNewPassword)}
                    placeholder="대소문자, 숫자, 특수문자 포함 8자 이상"
                    disabled={isChangingPassword}
                  />
                </div>
                <div className="mp-field">
                  <label className="mp-label">새 비밀번호 확인</label>
                  <input
                    type="password"
                    className="mp-input"
                    value={confirmPassword}
                    onChange={handlePasswordInput(setConfirmPassword)}
                    disabled={isChangingPassword}
                  />
                </div>
                <button type="submit" className="mp-submit-btn" disabled={isChangingPassword}>
                  {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div>
            <h2 className="mp-section-title">내가 쓴 문서</h2>
            <p className="mp-section-desc">직접 작성한 위키 문서 목록</p>
            {documentsLoading ? (
              <p className="mp-loading">로딩 중...</p>
            ) : myDocuments.length === 0 ? (
              <p className="mp-empty">작성한 문서가 없습니다.</p>
            ) : (
              <div className="mp-table-wrap">
                <table className="mp-table">
                  <thead>
                    <tr>
                      <th>제목</th>
                      <th>카테고리</th>
                      <th>작성일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myDocuments.map((doc) => (
                      <tr key={doc.id} onClick={() => navigate(`/wiki/${doc.id}`)}>
                        <td className="mp-title-cell">{doc.title}</td>
                        <td>{doc.categoryName}</td>
                        <td>{getRelativeTime(doc.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'inquiries':
        return (
          <div>
            <h2 className="mp-section-title">내가 처리한 민원</h2>
            <p className="mp-section-desc">담당자로 배정된 민원 목록</p>
            {inquiriesLoading ? (
              <p className="mp-loading">로딩 중...</p>
            ) : myInquiries.length === 0 ? (
              <p className="mp-empty">처리한 민원이 없습니다.</p>
            ) : (
              <div className="mp-table-wrap">
                <div className="mp-table-toolbar">
                  <label className="mp-filter-check">
                    <input
                      type="checkbox"
                      checked={todayOnly}
                      onChange={(e) => setTodayOnly(e.target.checked)}
                    />
                    당일 민원만 보기
                  </label>
                  <div className="mp-report-group">
                    <input
                      type="date"
                      className="mp-report-date"
                      value={reportDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setReportDate(e.target.value)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    />
                    <button
                      className="mp-report-btn"
                      onClick={handleDownloadReport}
                      disabled={reportDownloading}
                    >
                      {reportDownloading ? '생성 중...' : '업무 일지 생성'}
                    </button>
                  </div>
                </div>
                <table className="mp-table">
                  <thead>
                    <tr>
                      <th>상태</th>
                      <th>유형</th>
                      <th>제목</th>
                      <th>요청자</th>
                      <th>작업자</th>
                      <th>위치</th>
                      <th>처리</th>
                      <th>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedInquiries.map((inquiry) => {
                      const isExpanded = expandedInquiryId === inquiry.id;
                      return (
                        <Fragment key={inquiry.id}>
                          <tr
                            onClick={() => setExpandedInquiryId(isExpanded ? null : inquiry.id)}
                            className={isExpanded ? 'expanded' : ''}
                          >
                            <td>
                              <span className={`status-badge status-${inquiry.status.toLowerCase().replace('_', '-')}`}>
                                {INQUIRY_STATUS_MAP[inquiry.status]}
                              </span>
                            </td>
                            <td>{INQUIRY_TYPE_MAP[inquiry.type]}</td>
                            <td className="mp-title-cell">{inquiry.title}</td>
                            <td>{inquiry.requester}</td>
                            <td>
                              <div>{inquiry.workerName || '-'}</div>
                              {inquiry.subWorkerName && (
                                <div className="mp-sub-worker">{inquiry.subWorkerName}</div>
                              )}
                            </td>
                            <td>
                              {(() => {
                                const groups = formatLocationGroups(inquiry.locations);
                                return groups.length > 0 ? groups.join(', ') : '-';
                              })()}
                            </td>
                            <td>{inquiry.method ? INQUIRY_METHOD_MAP[inquiry.method] : '-'}</td>
                            <td>{formatDateTime(inquiry.createdAt)}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="mp-detail-row">
                              <td colSpan={8}>
                                <div className="mp-detail-expand">
                                  <div className="mp-detail-meta">
                                    {inquiry.locations.length > 0 && (
                                      <div className="mp-detail-meta-item">
                                        <span className="mp-detail-meta-label">위치</span>
                                        <span className="mp-detail-meta-value">
                                          {formatLocationGroups(inquiry.locations).map((g, i) => (
                                            <span key={i}>{i > 0 && <br />}{g}</span>
                                          ))}
                                        </span>
                                      </div>
                                    )}
                                    <div className="mp-detail-meta-item">
                                      <span className="mp-detail-meta-label">접수일</span>
                                      <span className="mp-detail-meta-value">{formatDateTime(inquiry.createdAt)}</span>
                                    </div>
                                    <div className="mp-detail-meta-item">
                                      <span className="mp-detail-meta-label">처리일</span>
                                      <span className="mp-detail-meta-value">{formatDateTime(inquiry.completedAt)}</span>
                                    </div>
                                  </div>
                                  <div className="mp-detail-split">
                                    <div className="mp-detail-panel">
                                      <div className="mp-detail-panel-label">증상</div>
                                      <div className="mp-detail-panel-body">
                                        {inquiry.description
                                          ? inquiry.description
                                          : <span className="mp-detail-empty">-</span>}
                                      </div>
                                    </div>
                                    <div className="mp-detail-panel">
                                      <div className="mp-detail-panel-label">해결 내용</div>
                                      <div className="mp-detail-panel-body">
                                        {inquiry.solution
                                          ? inquiry.solution
                                          : <span className="mp-detail-empty">-</span>}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page my-page">
      <div className="mp-layout">
        <aside className="mp-nav-card">
          <div className="mp-profile">
            <div className="mp-avatar">{currentUser?.name?.charAt(0) || 'U'}</div>
            <span className="mp-profile-name">{currentUser?.name}</span>
            <span className="mp-profile-role">
              {currentUser?.role ? getRoleLabel(currentUser.role) : ''}
            </span>
          </div>
          <nav className="mp-nav">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`mp-nav-item${activeTab === item.key ? ' active' : ''}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="mp-main">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
