import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { adminApi } from '../api/adminApi';
import { documentApi } from '../api/documentApi';
import type { AdminUser, AdminUserStats, UserRole, RoleOption, BatchEmbedResult, DocumentSummary } from '../types';

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

export default function AdminPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { currentUser } = useWiki();

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

  const handleRestore = async (docId: number) => {
    setDocActionLoading(docId);
    try {
      await documentApi.restore(docId);
      setMessage({ type: 'success', text: '문서가 복구되었습니다.' });
      await fetchDeletedDocs();
    } catch {
      setMessage({ type: 'error', text: '문서 복구에 실패했습니다.' });
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
    { key: 'dashboard', label: '대시보드', path: '/admin/dashboard' },
    { key: 'users', label: '전체 회원', path: '/admin/users' },
    { key: 'pending', label: '승인 대기', path: '/admin/pending' },
    { key: 'trash', label: '삭제된 문서', path: '/admin/trash' },
  ];

  const renderDashboard = () => {
    if (loading) return <p>로딩 중...</p>;

    return (
      <div className="my-section">
        <h2>관리자 대시보드</h2>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-label">전체 회원</span>
            <span className="admin-stat-value">{stats.totalUsers}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">활성 회원</span>
            <span className="admin-stat-value admin-stat-active">{stats.activeUsers}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">승인 대기</span>
            <span className="admin-stat-value admin-stat-pending">{stats.pendingUsers}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">일반 회원</span>
            <span className="admin-stat-value">{stats.staffCount}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">관리자</span>
            <span className="admin-stat-value">{stats.adminCount}</span>
          </div>
        </div>
        {stats.pendingUsers > 0 && (
          <div className="admin-pending-alert">
            승인 대기 중인 회원이 {stats.pendingUsers}명 있습니다.
            <button className="link-button" onClick={() => navigate('/admin/pending')}>
              확인하기
            </button>
          </div>
        )}
        <div className="admin-rag-section">
          <h3>RAG 임베딩</h3>
          <p className="admin-rag-desc">기존에 임베딩된 자료를 전부 삭제하고 완료된 민원을 다시 임베딩합니다.</p>
          <button
            className="btn btn-primary"
            onClick={handleEmbedAll}
            disabled={embedLoading}
          >
            {embedLoading ? '임베딩 중...' : '재임베딩'}
          </button>
          {embedResult && (
            <div className="admin-rag-result">
              {embedResult.message}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUserTable = (userList: AdminUser[], isPending: boolean) => {
    if (loading) return <p>로딩 중...</p>;
    if (userList.length === 0) {
      return <p className="empty-message">{isPending ? '승인 대기 중인 회원이 없습니다.' : '회원이 없습니다.'}</p>;
    }

    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>역할</th>
            <th>상태</th>
            <th>가입일</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {userList.map((user) => (
            <tr key={user.id}>
              <td className="admin-user-name">{user.name}</td>
              <td>{user.email}</td>
              <td>
                <span className={`admin-role-badge admin-role-${user.role.toLowerCase()}`}>
                  {getRoleLabel(user.role)}
                </span>
              </td>
              <td>
                {!user.approved ? (
                  <span className="admin-status-badge admin-status-pending">승인 대기</span>
                ) : user.active ? (
                  <span className="admin-status-badge admin-status-active">활성</span>
                ) : (
                  <span className="admin-status-badge admin-status-inactive">비활성</span>
                )}
              </td>
              <td>{formatDateTime(user.createdAt)}</td>
              <td>
                <div className="admin-actions">
                  {isPending ? (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleApprove(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      승인
                    </button>
                  ) : (
                    <>
                      {!user.approved && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          승인
                        </button>
                      )}
                      {user.approved && user.active ? (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleDeactivate(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          비활성화
                        </button>
                      ) : user.approved && !user.active ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleActivate(user.id)}
                          disabled={actionLoading === user.id}
                        >
                          활성화
                        </button>
                      ) : null}
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setPasswordModal({ userId: user.id, name: user.name });
                          setNewPassword('');
                        }}
                        disabled={actionLoading === user.id}
                      >
                        비밀번호 변경
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setRoleModal({ userId: user.id, name: user.name, currentRole: user.role });
                          setNewRole(user.role);
                        }}
                        disabled={actionLoading === user.id}
                      >
                        역할 변경
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return (
          <div className="my-section">
            <h2>전체 회원 관리</h2>
            {renderUserTable(allUsers, false)}
          </div>
        );
      case 'pending':
        return (
          <div className="my-section">
            <h2>승인 대기 회원</h2>
            {renderUserTable(pendingUsers, true)}
          </div>
        );
      case 'trash':
        return (
          <div className="my-section">
            <h2>삭제된 문서</h2>
            {deletedLoading ? (
              <p>로딩 중...</p>
            ) : deletedDocs.length === 0 ? (
              <p className="empty-message">삭제된 문서가 없습니다.</p>
            ) : (
              <table className="admin-table">
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
                      <td>{doc.title}</td>
                      <td>{doc.categoryName}</td>
                      <td>{doc.authorName}</td>
                      <td>{formatDateTime(doc.updatedAt)}</td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleRestore(doc.id)}
                            disabled={docActionLoading === doc.id}
                          >
                            복구
                          </button>
                          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'TA') && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handlePermanentDelete(doc.id, doc.title)}
                              disabled={docActionLoading === doc.id}
                            >
                              영구 삭제
                            </button>
                          )}
                        </div>
                      </td>
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
      {/* 비밀번호 변경 모달 */}
      {passwordModal && (
        <div className="admin-modal-overlay" onClick={() => setPasswordModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>비밀번호 변경</h3>
            <p className="admin-modal-desc">{passwordModal.name} 회원의 비밀번호를 변경합니다.</p>
            <div className="form-group">
              <label className="form-label">새 비밀번호</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력"
                autoFocus
              />
            </div>
            <div className="admin-modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={!newPassword || actionLoading === passwordModal.userId}
              >
                변경
              </button>
              <button className="btn btn-secondary" onClick={() => setPasswordModal(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 역할 변경 모달 */}
      {roleModal && (
        <div className="admin-modal-overlay" onClick={() => setRoleModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>역할 변경</h3>
            <p className="admin-modal-desc">{roleModal.name} 회원의 역할을 변경합니다.</p>
            <div className="form-group">
              <label className="form-label">역할</label>
              <select
                className="form-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
              >
                {roles.map((r) => (
                  <option key={r.code} value={r.code}>{r.displayName}</option>
                ))}
              </select>
            </div>
            <div className="admin-modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleChangeRole}
                disabled={actionLoading === roleModal.userId}
              >
                변경
              </button>
              <button className="btn btn-secondary" onClick={() => setRoleModal(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="my-page-layout">
        <aside className="my-sidebar">
          <div className="my-sidebar-header">
            <div className="my-sidebar-avatar admin-avatar">A</div>
            <span className="my-sidebar-name">관리자</span>
          </div>
          <nav className="my-sidebar-menu">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`my-sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              >
                {item.label}
                {item.key === 'pending' && stats.pendingUsers > 0 && (
                  <span className="admin-badge-count">{stats.pendingUsers}</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="my-content">
          {message && (
            <div className={message.type === 'success' ? 'form-success' : 'form-error'}>
              {message.text}
            </div>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
