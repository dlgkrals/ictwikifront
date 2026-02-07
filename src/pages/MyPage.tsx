import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { authApi, documentApi, inquiryApi } from '../api';
import type { DocumentSummary, Inquiry } from '../types';
import { INQUIRY_STATUS_MAP, INQUIRY_TYPE_MAP } from '../types';

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

export default function MyPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { currentUser } = useWiki();

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
                  {currentUser?.role === 'ADMIN' ? '관리자' : currentUser?.role === 'STAFF' ? '직원' : '학생'}
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
            <h2>내가 처리한 민원</h2>
            {inquiriesLoading ? (
              <p>로딩 중...</p>
            ) : myInquiries.length === 0 ? (
              <p className="empty-message">처리한 민원이 없습니다.</p>
            ) : (
              <table className="my-table">
                <thead>
                  <tr>
                    <th>상태</th>
                    <th>유형</th>
                    <th>제목</th>
                    <th>요청자</th>
                    <th>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {myInquiries.map((inquiry) => (
                    <tr key={inquiry.id} onClick={() => navigate('/inquiries')} className="clickable-row">
                      <td>
                        <span className={`status-badge status-${inquiry.status.toLowerCase().replace('_', '-')}`}>
                          {INQUIRY_STATUS_MAP[inquiry.status]}
                        </span>
                      </td>
                      <td>{INQUIRY_TYPE_MAP[inquiry.type]}</td>
                      <td>{inquiry.title}</td>
                      <td>{inquiry.requester}</td>
                      <td>{getRelativeTime(inquiry.createdAt)}</td>
                    </tr>
                  ))}
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
