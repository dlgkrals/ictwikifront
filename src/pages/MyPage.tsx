import { useState, useEffect, useMemo, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { authApi, documentApi, inquiryApi, reportApi } from '../api';
import type { DocumentSummary, Inquiry, LocationResponse } from '../types';
import { INQUIRY_STATUS_MAP, INQUIRY_TYPE_MAP, INQUIRY_METHOD_MAP } from '../types';

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
    const buildingName = locs[0].buildingName;
    if (locs.length === 1) return locs[0].formatted;
    const allPureNumbers = locs.every((l) => l.roomNumber != null && !l.roomName);
    if (allPureNumbers) {
      const parts = locs.map((l, i) => (i === locs.length - 1 ? `${l.roomNumber}호` : `${l.roomNumber}`));
      return `${buildingName} ${parts.join(', ')}`;
    }
    const parts = locs.map((l) => {
      if (l.roomNumber != null && l.roomName) return `${l.roomNumber}호 ${l.roomName}`;
      if (l.roomNumber != null) return `${l.roomNumber}호`;
      return l.roomName || '';
    });
    return `${buildingName} ${parts.join(', ')}`;
  });
}

export default function MyPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { currentUser, getRoleLabel } = useWiki();

  const activeTab: MyPageTab = (tab as MyPageTab) || 'info';

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // My documents state
  const [myDocuments, setMyDocuments] = useState<DocumentSummary[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // My inquiries state
  const [myInquiries, setMyInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
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
      await reportApi.downloadDailyReport();
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
    { key: 'info', label: '개인정보 조회', path: '/my/info' },
    { key: 'password', label: '비밀번호 변경', path: '/my/password' },
    { key: 'documents', label: '내가 쓴 문서', path: '/my/documents' },
    { key: 'inquiries', label: '내가 처리한 민원', path: '/my/inquiries' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="my-section">
            <h2>개인정보</h2>
            <div className="info-card">
              <div className="info-row">
                <span className="info-label">이름</span>
                <span className="info-value">{currentUser?.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">이메일</span>
                <span className="info-value">{currentUser?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">역할</span>
                <span className="info-value">
                  {currentUser?.role ? getRoleLabel(currentUser.role) : ''}
                </span>
              </div>
            </div>
          </div>
        );

      case 'password':
        return (
          <div className="my-section">
            <h2>비밀번호 변경</h2>
            <form className="password-form" onSubmit={handlePasswordChange}>
              {passwordError && <div className="form-error">{passwordError}</div>}
              {passwordSuccess && <div className="form-success">{passwordSuccess}</div>}
              <div className="form-group">
                <label>현재 비밀번호</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={handlePasswordInput(setCurrentPassword)}
                  className="form-input"
                  disabled={isChangingPassword}
                />
              </div>
              <div className="form-group">
                <label>새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={handlePasswordInput(setNewPassword)}
                  className="form-input"
                  placeholder="대소문자, 숫자, 특수문자 포함 8자 이상"
                  disabled={isChangingPassword}
                />
              </div>
              <div className="form-group">
                <label>새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={handlePasswordInput(setConfirmPassword)}
                  className="form-input"
                  disabled={isChangingPassword}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
                {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </div>
        );

      case 'documents':
        return (
          <div className="my-section">
            <h2>내가 쓴 문서</h2>
            {documentsLoading ? (
              <p>로딩 중...</p>
            ) : myDocuments.length === 0 ? (
              <p className="empty-message">작성한 문서가 없습니다.</p>
            ) : (
              <table className="my-table">
                <thead>
                  <tr>
                    <th>제목</th>
                    <th>카테고리</th>
                    <th>조회수</th>
                    <th>작성일</th>
                  </tr>
                </thead>
                <tbody>
                  {myDocuments.map((doc) => (
                    <tr key={doc.id} onClick={() => navigate(`/wiki/${doc.id}`)} className="clickable-row">
                      <td>{doc.title}</td>
                      <td>{doc.categoryName}</td>
                      <td>{doc.viewCount}</td>
                      <td>{getRelativeTime(doc.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );

      case 'inquiries':
        return (
          <div className="my-section">
            <div className="my-section-header">
              <div className="my-section-header-left">
                <h2>내가 처리한 민원</h2>
                <label className="filter-checkbox" style={{ paddingTop: 0 }}>
                  <input
                    type="checkbox"
                    checked={todayOnly}
                    onChange={(e) => setTodayOnly(e.target.checked)}
                  />
                  당일 민원만 보기
                </label>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleDownloadReport}
                disabled={reportDownloading}
              >
                {reportDownloading ? '생성 중...' : '업무 일지 생성'}
              </button>
            </div>
            {inquiriesLoading ? (
              <p>로딩 중...</p>
            ) : displayedInquiries.length === 0 ? (
              <p className="empty-message">처리한 민원이 없습니다.</p>
            ) : (
              <table className="my-table">
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
                          className={`clickable-row ${isExpanded ? 'expanded' : ''}`}
                        >
                          <td>
                            <span className={`status-badge status-${inquiry.status.toLowerCase().replace('_', '-')}`}>
                              {INQUIRY_STATUS_MAP[inquiry.status]}
                            </span>
                          </td>
                          <td>{INQUIRY_TYPE_MAP[inquiry.type]}</td>
                          <td>{inquiry.title}</td>
                          <td>{inquiry.requester}</td>
                          <td>
                            <div>{inquiry.workerName || '-'}</div>
                            {inquiry.subWorkerName && (
                              <div className="sub-worker-name">{inquiry.subWorkerName}</div>
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
                          <tr className="inquiry-detail-row">
                            <td colSpan={8}>
                              <div className="inquiry-detail">
                                <div className="detail-content">
                                  {inquiry.locations.length > 0 && (
                                    <div className="detail-row">
                                      <span className="detail-label">위치:</span>
                                      <span>
                                        {formatLocationGroups(inquiry.locations).map((g, i) => (
                                          <span key={i}>{i > 0 && <br />}{g}</span>
                                        ))}
                                      </span>
                                    </div>
                                  )}
                                  <div className="detail-row">
                                    <span className="detail-label">접수 날짜:</span>
                                    <span>{formatDateTime(inquiry.createdAt)}</span>
                                  </div>
                                  <div className="detail-row">
                                    <span className="detail-label">처리 날짜:</span>
                                    <span>{formatDateTime(inquiry.completedAt)}</span>
                                  </div>
                                  {inquiry.description && (
                                    <div className="detail-row">
                                      <span className="detail-label">증상:</span>
                                      <span className="detail-text">{inquiry.description}</span>
                                    </div>
                                  )}
                                  {inquiry.solution && (
                                    <div className="detail-row solution">
                                      <span className="detail-label">해결 내용:</span>
                                      <span className="detail-text">{inquiry.solution}</span>
                                    </div>
                                  )}
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
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page my-page">
      <div className="my-page-layout">
        <aside className="my-sidebar">
          <div className="my-sidebar-header">
            <div className="my-sidebar-avatar">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <span className="my-sidebar-name">{currentUser?.name}</span>
          </div>
          <nav className="my-sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`my-sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="my-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
