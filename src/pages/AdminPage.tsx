import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { adminApi } from '../api/adminApi';
import type { AdminUser, AdminUserStats, UserRole } from '../types';

type AdminTab = 'dashboard' | 'users' | 'pending';

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: '관리자',
  STAFF: '직원',
  STUDENT: '학생',
};

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function AdminPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { currentUser } = useWiki();

  const activeTab: AdminTab = (tab as AdminTab) || 'dashboard';

  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 비밀번호 변경 모달
  const [passwordModal, setPasswordModal] = useState<{ userId: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // 권한 변경 모달
  const [roleModal, setRoleModal] = useState<{ userId: number; name: string; currentRole: UserRole } | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="page">
        <h1 className="page-title">접근 권한이 없습니다</h1>
        <p>관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  useEffect(() => {
    setMessage(null);
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'pending') {
      fetchPendingUsers();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch {
      setMessage({ type: 'error', text: '통계를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllUsers();
      setUsers(data);
    } catch {
      setMessage({ type: 'error', text: '회원 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPendingUsers();
      setPendingUsers(data);
    } catch {
      setMessage({ type: 'error', text: '승인 대기 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      await adminApi.approveUser(userId);
      setMessage({ type: 'success', text: '회원이 승인되었습니다.' });
      if (activeTab === 'pending') await fetchPendingUsers();
      else await fetchUsers();
    } catch {
      setMessage({ type: 'error', text: '승인에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm('정말 승인을 거부하시겠습니까?')) return;
    setActionLoading(userId);
    try {
      await adminApi.rejectUser(userId);
      setMessage({ type: 'success', text: '승인이 거부되었습니다.' });
      if (activeTab === 'pending') await fetchPendingUsers();
      else await fetchUsers();
    } catch {
      setMessage({ type: 'error', text: '승인 거부에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (userId: number) => {
    setActionLoading(userId);
    try {
      await adminApi.activateUser(userId);
      setMessage({ type: 'success', text: '계정이 활성화되었습니다.' });
      await fetchUsers();
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
      await fetchUsers();
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
      await fetchUsers();
    } catch {
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordModal || !newPassword) return;
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: '비밀번호는 8자 이상이어야 합니다.' });
      return;
    }
    try {
      await adminApi.changePassword(passwordModal.userId, newPassword);
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' });
      setPasswordModal(null);
      setNewPassword('');
    } catch {
      setMessage({ type: 'error', text: '비밀번호 변경에 실패했습니다.' });
    }
  };

  const handleRoleChange = async () => {
    if (!roleModal) return;
    try {
      await adminApi.changeRole(roleModal.userId, selectedRole);
      setMessage({ type: 'success', text: '권한이 변경되었습니다.' });
      setRoleModal(null);
      await fetchUsers();
    } catch {
      setMessage({ type: 'error', text: '권한 변경에 실패했습니다.' });
    }
  };

  const menuItems = [
    { key: 'dashboard', label: '대시보드', path: '/admin/dashboard' },
    { key: 'users', label: '전체 회원', path: '/admin/users' },
    { key: 'pending', label: '승인 대기', path: '/admin/pending' },
  ];

  const renderDashboard = () => {
    if (loading) return <p>로딩 중...</p>;
    if (!stats) return null;

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
            <span className="admin-stat-label">직원</span>
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
                  {ROLE_LABEL[user.role]}
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
                    <>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        승인
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleReject(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        거부
                      </button>
                    </>
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
                          setRoleModal({ userId: user.id, name: user.name, currentRole: user.role });
                          setSelectedRole(user.role);
                        }}
                      >
                        권한
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setPasswordModal({ userId: user.id, name: user.name });
                          setNewPassword('');
                        }}
                      >
                        비밀번호
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
            {renderUserTable(users, false)}
          </div>
        );
      case 'pending':
        return (
          <div className="my-section">
            <h2>승인 대기 회원</h2>
            {renderUserTable(pendingUsers, true)}
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
                {item.key === 'pending' && stats && stats.pendingUsers > 0 && (
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

      {/* 비밀번호 변경 모달 */}
      {passwordModal && (
        <div className="admin-modal-overlay" onClick={() => setPasswordModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>비밀번호 변경</h3>
            <p className="admin-modal-desc">{passwordModal.name}님의 비밀번호를 변경합니다.</p>
            <div className="form-group">
              <label>새 비밀번호</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                className="form-input"
                placeholder="대소문자, 숫자, 특수문자 포함 8자 이상"
              />
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={handlePasswordChange}>변경</button>
              <button className="btn btn-secondary" onClick={() => setPasswordModal(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 권한 변경 모달 */}
      {roleModal && (
        <div className="admin-modal-overlay" onClick={() => setRoleModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>권한 변경</h3>
            <p className="admin-modal-desc">
              {roleModal.name}님의 권한을 변경합니다. (현재: {ROLE_LABEL[roleModal.currentRole]})
            </p>
            <div className="form-group">
              <label>역할</label>
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              >
                <option value="STUDENT">학생</option>
                <option value="STAFF">직원</option>
                <option value="ADMIN">관리자</option>
              </select>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={handleRoleChange}>변경</button>
              <button className="btn btn-secondary" onClick={() => setRoleModal(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
