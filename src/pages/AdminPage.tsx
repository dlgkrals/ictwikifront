import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { adminApi } from '../api/adminApi';
import { documentApi } from '../api/documentApi';
import type { AdminUser, AdminUserStats, UserRole, RoleOption, BatchEmbedResult, DocumentSummary } from '../types';
import '../styles/adminstyle.css';

type AdminTab = 'dashboard' | 'users' | 'pending' | 'trash';

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function calcStats(users: AdminUser[]): AdminUserStats {
  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.active).length,
    pendingUsers: users.filter((u) => !u.approved).length,
    staffCount: users.filter((u) => u.role !== 'ADMIN').length,
    adminCount: users.filter((u) => u.role === 'ADMIN').length,
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function avatarClass(role: UserRole, approved: boolean): string {
  if (!approved) return 'acp-avatar-amber';
  switch (role) {
    case 'ADMIN': return 'acp-avatar-blue';
    case 'TA': return 'acp-avatar-purple';
    default: return 'acp-avatar-slate';
  }
}

function roleBadgeClass(role: UserRole, approved: boolean): string {
  if (!approved) return 'acp-role-pending';
  switch (role) {
    case 'ADMIN': return 'acp-role-admin';
    case 'TA': return 'acp-role-ta';
    default: return 'acp-role-student';
  }
}

/* ── Inline SVG Icons ── */
const IconDashboard = () => (
  <svg className="acp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconUsers = () => (
  <svg className="acp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconPendingNav = () => (
  <svg className="acp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconTrashNav = () => (
  <svg className="acp-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const IconGroup = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconBolt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconKey = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="15" r="4" />
    <line x1="11" y1="12" x2="20" y2="3" />
    <line x1="17" y1="9" x2="19" y2="11" />
  </svg>
);

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const IconActivate = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 12 16 16 8" />
  </svg>
);

const IconDeactivate = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconRestore = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.36" />
  </svg>
);

const IconClose = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function AdminPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { currentUser, fetchDocuments } = useWiki();

  const activeTab: AdminTab = (tab as AdminTab) || 'dashboard';

  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedResult, setEmbedResult] = useState<BatchEmbedResult | null>(null);

  const [deletedDocs, setDeletedDocs] = useState<DocumentSummary[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [docActionLoading, setDocActionLoading] = useState<number | null>(null);
  const [restoreConflictId, setRestoreConflictId] = useState<number | null>(null);

  const [passwordModal, setPasswordModal] = useState<{ userId: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [roleModal, setRoleModal] = useState<{ userId: number; name: string; currentRole: UserRole } | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'TA') {
    return (
      <div className="page">
        <h1 className="page-title">접근 권한이 없습니다</h1>
        <p>관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  useEffect(() => {
    setMessage(null);
    if (activeTab === 'trash') {
      fetchDeletedDocs();
    } else {
      fetchAllUsers();
    }
  }, [activeTab]);

  const fetchDeletedDocs = async () => {
    setDeletedLoading(true);
    try {
      const data = await documentApi.getDeletedDocuments();
      setDeletedDocs(data);
    } catch {
      setMessage({ type: 'error', text: '삭제된 문서 목록을 불러오는데 실패했습니다.' });
    } finally {
      setDeletedLoading(false);
    }
  };

  const handleRestore = async (docId: number, force = false) => {
    setDocActionLoading(docId);
    try {
      await documentApi.restore(docId, force);
      setMessage({ type: 'success', text: '문서가 복구되었습니다.' });
      await Promise.all([fetchDeletedDocs(), fetchDocuments()]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setRestoreConflictId(docId);
      } else {
        setMessage({ type: 'error', text: '문서 복구에 실패했습니다.' });
      }
    } finally {
      setDocActionLoading(null);
    }
  };

  const handlePermanentDelete = async (docId: number, title: string) => {
    if (!confirm(`"${title}" 문서를 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.`)) return;
    setDocActionLoading(docId);
    try {
      await documentApi.permanentDelete(docId);
      setMessage({ type: 'success', text: '문서가 영구 삭제되었습니다.' });
      await fetchDeletedDocs();
    } catch {
      setMessage({ type: 'error', text: '영구 삭제에 실패했습니다.' });
    } finally {
      setDocActionLoading(null);
    }
  };

  useEffect(() => {
    adminApi.getRoles().then(setRoles).catch(() => {});
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllUsers();
      setAllUsers(data);
    } catch {
      setMessage({ type: 'error', text: '회원 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (code: UserRole) =>
    roles.find((r) => r.code === code)?.displayName ?? code;

  const handleEmbedAll = async () => {
    if (!confirm('전체 완료 민원을 임베딩합니다. 계속하시겠습니까?')) return;
    setEmbedLoading(true);
    setEmbedResult(null);
    try {
      const result = await adminApi.embedAll();
      setEmbedResult(result);
    } catch {
      setMessage({ type: 'error', text: '배치 임베딩에 실패했습니다.' });
    } finally {
      setEmbedLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      await adminApi.approveUser(userId);
      setMessage({ type: 'success', text: '회원이 승인되었습니다.' });
      await fetchAllUsers();
    } catch {
      setMessage({ type: 'error', text: '승인에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (userId: number) => {
    setActionLoading(userId);
    try {
      await adminApi.activateUser(userId);
      setMessage({ type: 'success', text: '계정이 활성화되었습니다.' });
      await fetchAllUsers();
    } catch {
      setMessage({ type: 'error', text: '활성화에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (userId: number) => {
    if (!confirm('정말 비활성화하시겠습니까?')) return;
    setActionLoading(userId);
    try {
      await adminApi.deactivateUser(userId);
      setMessage({ type: 'success', text: '계정이 비활성화되었습니다.' });
      await fetchAllUsers();
    } catch {
      setMessage({ type: 'error', text: '비활성화에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setActionLoading(userId);
    try {
      await adminApi.deleteUser(userId);
      setMessage({ type: 'success', text: '회원이 삭제되었습니다.' });
      await fetchAllUsers();
    } catch {
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordModal) return;
    setActionLoading(passwordModal.userId);
    try {
      await adminApi.changePassword(passwordModal.userId, newPassword);
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' });
      setPasswordModal(null);
      setNewPassword('');
    } catch {
      setMessage({ type: 'error', text: '비밀번호 변경에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async () => {
    if (!roleModal) return;
    setActionLoading(roleModal.userId);
    try {
      await adminApi.changeRole(roleModal.userId, newRole);
      setMessage({ type: 'success', text: '역할이 변경되었습니다.' });
      setRoleModal(null);
      await fetchAllUsers();
    } catch {
      setMessage({ type: 'error', text: '역할 변경에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const stats = calcStats(allUsers);
  const pendingUsers = allUsers.filter((u) => !u.approved);

  const menuItems = [
    { key: 'dashboard', label: '대시보드', path: '/admin/dashboard', icon: <IconDashboard /> },
    { key: 'users', label: '전체 회원', path: '/admin/users', icon: <IconUsers /> },
    { key: 'pending', label: '승인 대기', path: '/admin/pending', icon: <IconPendingNav /> },
    { key: 'trash', label: '삭제된 문서', path: '/admin/trash', icon: <IconTrashNav /> },
  ];

  const renderDashboard = () => {
    if (loading) return <p className="acp-loading">로딩 중...</p>;

    return (
      <div>
        <div className="acp-section-header">
          <div>
            <h2 className="acp-section-title">대시보드 개요</h2>
            <p className="acp-section-desc">시스템 현황 및 사용자 통계</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="acp-stats-grid">
          <div className="acp-stat-card acp-stat-card-blue">
            <div className="acp-stat-top">
              <div className="acp-stat-icon acp-stat-icon-blue"><IconGroup /></div>
            </div>
            <p className="acp-stat-label">전체 회원</p>
            <h3 className="acp-stat-value">{stats.totalUsers}</h3>
          </div>
          <div className="acp-stat-card acp-stat-card-green">
            <div className="acp-stat-top">
              <div className="acp-stat-icon acp-stat-icon-green"><IconBolt /></div>
            </div>
            <p className="acp-stat-label">활성 회원</p>
            <h3 className="acp-stat-value">{stats.activeUsers}</h3>
          </div>
          <div className="acp-stat-card acp-stat-card-amber">
            <div className="acp-stat-top">
              <div className="acp-stat-icon acp-stat-icon-amber"><IconClock /></div>
            </div>
            <p className="acp-stat-label">승인 대기</p>
            <h3 className="acp-stat-value">{stats.pendingUsers}</h3>
          </div>
        </div>

        {/* Bottom row: RAG + System Staff */}
        <div className="acp-dashboard-bottom">
          <div className="acp-rag-card">
            <div className="acp-rag-header">
              <h4 className="acp-rag-title">RAG 재임베딩</h4>
              {embedLoading && <span className="acp-rag-badge">처리 중</span>}
            </div>
            <p className="acp-rag-desc">
              기존에 임베딩된 자료를 전부 삭제하고 완료된 민원을 다시 임베딩합니다.
            </p>
            <div className="acp-rag-footer">
              <span className="acp-rag-hint">완료된 민원을 기반으로 AI 추천이 작동합니다</span>
              <button className="acp-trigger-btn" onClick={handleEmbedAll} disabled={embedLoading}>
                {embedLoading ? '임베딩 중...' : '재임베딩 실행'}
              </button>
            </div>
            {embedResult && (
              <div className="acp-rag-result">{embedResult.message}</div>
            )}
          </div>

          <div className="acp-staff-card">
            <h4 className="acp-staff-title">시스템 역할</h4>
            <p className="acp-staff-desc">역할 분포 현황</p>
            <div className="acp-staff-rows">
              <div className="acp-staff-row">
                <span>관리자</span>
                <span className="acp-staff-count">{stats.adminCount}</span>
              </div>
              <div className="acp-staff-row">
                <span>일반 회원</span>
                <span className="acp-staff-count">{stats.staffCount}</span>
              </div>
            </div>
          </div>
        </div>

        {stats.pendingUsers > 0 && (
          <div className="acp-alert">
            승인 대기 중인 회원이 {stats.pendingUsers}명 있습니다.
            <button className="acp-alert-link" onClick={() => navigate('/admin/pending')}>
              확인하기
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderUserTable = (userList: AdminUser[], isPending: boolean) => {
    if (loading) return <p className="acp-loading">로딩 중...</p>;
    if (userList.length === 0) {
      return (
        <p className="acp-empty">
          {isPending ? '승인 대기 중인 회원이 없습니다.' : '회원이 없습니다.'}
        </p>
      );
    }

    return (
      <div className="acp-table-wrap">
        <table className="acp-table">
          <thead>
            <tr>
              <th>회원</th>
              <th>역할</th>
              <th>상태</th>
              <th>가입일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="acp-user-cell">
                    <div className={`acp-avatar ${avatarClass(user.role, user.approved)}`}>
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <div className="acp-user-name">{user.name}</div>
                      <div className="acp-user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`acp-role-badge ${roleBadgeClass(user.role, user.approved)}`}>
                    {user.approved ? getRoleLabel(user.role) : '미승인'}
                  </span>
                </td>
                <td>
                  {!user.approved ? (
                    <div className="acp-status">
                      <span className="acp-status-dot acp-dot-pending" />
                      <span className="acp-status-text">승인 대기</span>
                    </div>
                  ) : user.active ? (
                    <div className="acp-status">
                      <span className="acp-status-dot acp-dot-active" />
                      <span className="acp-status-text">활성</span>
                    </div>
                  ) : (
                    <div className="acp-status">
                      <span className="acp-status-dot acp-dot-inactive" />
                      <span className="acp-status-text">비활성</span>
                    </div>
                  )}
                </td>
                <td>{formatDateTime(user.createdAt)}</td>
                <td>
                  <div className="acp-actions">
                    {isPending ? (
                      <>
                        <button
                          className="acp-action-btn approve"
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          승인
                        </button>
                        <button
                          className="acp-action-btn danger"
                          onClick={() => handleDelete(user.id)}
                          disabled={actionLoading === user.id}
                          title="삭제"
                        >
                          <IconClose />
                        </button>
                      </>
                    ) : (
                      <>
                        {!user.approved && (
                          <button
                            className="acp-action-btn approve"
                            onClick={() => handleApprove(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            승인
                          </button>
                        )}
                        <button
                          className="acp-action-btn"
                          onClick={() => {
                            setRoleModal({ userId: user.id, name: user.name, currentRole: user.role });
                            setNewRole(user.role);
                          }}
                          disabled={actionLoading === user.id}
                          title="역할 변경"
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="acp-action-btn"
                          onClick={() => {
                            setPasswordModal({ userId: user.id, name: user.name });
                            setNewPassword('');
                          }}
                          disabled={actionLoading === user.id}
                          title="비밀번호 변경"
                        >
                          <IconKey />
                        </button>
                        {user.approved && user.active ? (
                          <button
                            className="acp-action-btn"
                            onClick={() => handleDeactivate(user.id)}
                            disabled={actionLoading === user.id}
                            title="비활성화"
                          >
                            <IconDeactivate />
                          </button>
                        ) : user.approved && !user.active ? (
                          <button
                            className="acp-action-btn"
                            onClick={() => handleActivate(user.id)}
                            disabled={actionLoading === user.id}
                            title="활성화"
                          >
                            <IconActivate />
                          </button>
                        ) : null}
                        <button
                          className="acp-action-btn danger"
                          onClick={() => handleDelete(user.id)}
                          disabled={actionLoading === user.id}
                          title="삭제"
                        >
                          <IconTrash />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return (
          <div>
            <div className="acp-section-header">
              <div>
                <h2 className="acp-section-title">전체 회원 관리</h2>
                <p className="acp-section-desc">회원 역할, 상태, 권한을 관리합니다</p>
              </div>
            </div>
            {renderUserTable(allUsers, false)}
          </div>
        );
      case 'pending':
        return (
          <div>
            <div className="acp-section-header">
              <div>
                <h2 className="acp-section-title">승인 대기 회원</h2>
                <p className="acp-section-desc">가입 신청 후 승인 대기 중인 회원 목록</p>
              </div>
            </div>
            {renderUserTable(pendingUsers, true)}
          </div>
        );
      case 'trash':
        return (
          <div>
            <div className="acp-section-header">
              <div>
                <h2 className="acp-section-title">삭제된 문서</h2>
                <p className="acp-section-desc">복구 또는 영구 삭제 처리</p>
              </div>
            </div>
            {deletedLoading ? (
              <p className="acp-loading">로딩 중...</p>
            ) : deletedDocs.length === 0 ? (
              <p className="acp-empty">삭제된 문서가 없습니다.</p>
            ) : (
              <div className="acp-table-wrap">
                <table className="acp-table">
                  <thead>
                    <tr>
                      <th>제목</th>
                      <th>카테고리</th>
                      <th>작성자</th>
                      <th>삭제일</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{doc.title}</td>
                        <td>{doc.categoryName}</td>
                        <td>{doc.authorName}</td>
                        <td>{formatDateTime(doc.updatedAt)}</td>
                        <td>
                          <div className="acp-actions">
                            <button
                              className="acp-action-btn"
                              onClick={() => handleRestore(doc.id)}
                              disabled={docActionLoading === doc.id}
                              title="복구"
                            >
                              <IconRestore />
                            </button>
                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'TA') && (
                              <button
                                className="acp-action-btn danger"
                                onClick={() => handlePermanentDelete(doc.id, doc.title)}
                                disabled={docActionLoading === doc.id}
                                title="영구 삭제"
                              >
                                <IconTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
    <div className="page admin-page">
      {/* 비밀번호 변경 모달 */}
      {passwordModal && (
        <div className="acp-modal-overlay" onClick={() => setPasswordModal(null)}>
          <div className="acp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acp-modal-head">
              <div>
                <h3 className="acp-modal-title">비밀번호 변경</h3>
                <p className="acp-modal-subtitle">{passwordModal.name} 회원의 비밀번호를 변경합니다.</p>
              </div>
              <button className="acp-modal-close" onClick={() => setPasswordModal(null)}>
                <IconClose />
              </button>
            </div>
            <div className="acp-modal-field">
              <label className="acp-modal-label">새 비밀번호</label>
              <input
                type="password"
                className="acp-modal-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
                autoFocus
              />
            </div>
            <div className="acp-modal-actions">
              <button
                className="acp-modal-btn-primary"
                onClick={handleChangePassword}
                disabled={!newPassword || actionLoading === passwordModal.userId}
              >
                변경
              </button>
              <button className="acp-modal-btn-secondary" onClick={() => setPasswordModal(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문서 복구 충돌 모달 */}
      {restoreConflictId !== null && (
        <div className="acp-modal-overlay" onClick={() => setRestoreConflictId(null)}>
          <div className="acp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acp-modal-head">
              <div>
                <h3 className="acp-modal-title">제목 충돌</h3>
                <p className="acp-modal-subtitle">
                  같은 제목의 문서가 이미 존재합니다.<br />
                  기존 문서를 삭제하고 복구하시겠습니까?
                </p>
              </div>
              <button className="acp-modal-close" onClick={() => setRestoreConflictId(null)}>
                <IconClose />
              </button>
            </div>
            <div className="acp-modal-actions">
              <button
                className="acp-modal-btn-danger"
                onClick={() => {
                  const id = restoreConflictId;
                  setRestoreConflictId(null);
                  handleRestore(id, true);
                }}
              >
                덮어쓰기
              </button>
              <button className="acp-modal-btn-secondary" onClick={() => setRestoreConflictId(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 역할 변경 모달 */}
      {roleModal && (
        <div className="acp-modal-overlay" onClick={() => setRoleModal(null)}>
          <div className="acp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="acp-modal-head">
              <div>
                <h3 className="acp-modal-title">역할 변경</h3>
                <p className="acp-modal-subtitle">{roleModal.name} 회원의 역할을 변경합니다.</p>
              </div>
              <button className="acp-modal-close" onClick={() => setRoleModal(null)}>
                <IconClose />
              </button>
            </div>
            <div className="acp-modal-field">
              <label className="acp-modal-label">역할</label>
              <select
                className="acp-modal-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
              >
                {roles.map((r) => (
                  <option key={r.code} value={r.code}>{r.displayName}</option>
                ))}
              </select>
            </div>
            <div className="acp-modal-actions">
              <button
                className="acp-modal-btn-primary"
                onClick={handleChangeRole}
                disabled={actionLoading === roleModal.userId}
              >
                변경
              </button>
              <button className="acp-modal-btn-secondary" onClick={() => setRoleModal(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="acp-layout">
        <aside className="acp-sidebar">
          <div className="acp-sidebar-brand">
            <span className="acp-brand-name">관리 콘솔</span>
            <span className="acp-brand-sub">Management Suite</span>
          </div>
          <nav className="acp-nav">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`acp-nav-item${activeTab === item.key ? ' active' : ''}`}
              >
                {item.icon}
                {item.label}
                {item.key === 'pending' && stats.pendingUsers > 0 && (
                  <span className="acp-nav-badge">{stats.pendingUsers}</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="acp-main">
          {message && (
            <div className={`acp-message ${message.type === 'success' ? 'acp-message-success' : 'acp-message-error'}`}>
              {message.text}
            </div>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
