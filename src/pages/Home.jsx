import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWiki, INQUIRY_STATUS, INQUIRY_METHOD } from '../context/WikiContext';

function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

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

export default function Home() {
  const { notices, inquiries, updateInquiry } = useWiki();
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const recentInquiries = inquiries.slice(0, 10);

  const getStatusClass = (status) => {
    switch (status) {
      case '시작 전': return 'status-pending';
      case '진행 중': return 'status-progress';
      case '완료': return 'status-done';
      case '보류': return 'status-hold';
      default: return '';
    }
  };

  const startEdit = (inquiry) => {
    setEditingId(inquiry.id);
    setEditData({ ...inquiry });
    setExpandedId(inquiry.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = () => {
    updateInquiry(editingId, editData);
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowClick = (id) => {
    if (editingId && editingId !== id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="page home-page">
      <h1 className="page-title">ICT Wiki</h1>

      <div className="notice-section">
        <h2>공지사항</h2>
        <ul className="notice-list">
          {notices.map((notice) => (
            <li key={notice.id} className="notice-item">
              <span className="notice-badge">공지</span>
              <span className="notice-title">{notice.title}</span>
              <span className="notice-date">{getRelativeTime(notice.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="inquiry-section">
        <div className="inquiry-header">
          <h2>최근 민원</h2>
          <Link to="/inquiries" className="btn btn-secondary">
            더보기
          </Link>
        </div>

        <table className="inquiry-table">
          <thead>
            <tr>
              <th>상태</th>
              <th>유형</th>
              <th>작업 이름</th>
              <th>요청자</th>
              <th>작업자</th>
              <th>처리</th>
              <th>등록일</th>
            </tr>
          </thead>
          <tbody>
            {recentInquiries.map((inquiry) => {
              const isExpanded = expandedId === inquiry.id;
              const isEditing = editingId === inquiry.id;

              return (
                <>
                  <tr
                    key={inquiry.id}
                    className={`inquiry-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => handleRowClick(inquiry.id)}
                  >
                    <td>
                      <span className={`status-badge ${getStatusClass(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td>{inquiry.type}</td>
                    <td className="inquiry-title-cell">{inquiry.title}</td>
                    <td>{inquiry.requester}</td>
                    <td>{inquiry.worker || '-'}</td>
                    <td>{inquiry.method || '-'}</td>
                    <td>{getRelativeTime(inquiry.createdAt)}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${inquiry.id}-detail`} className="inquiry-detail-row">
                      <td colSpan={7}>
                        {isEditing ? (
                          <div className="inquiry-edit-form">
                            <div className="edit-grid">
                              <div className="edit-group">
                                <label>상태</label>
                                <select
                                  value={editData.status}
                                  onChange={(e) => handleEditChange('status', e.target.value)}
                                  className="form-select"
                                >
                                  {INQUIRY_STATUS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="edit-group">
                                <label>작업자</label>
                                <input
                                  type="text"
                                  value={editData.worker}
                                  onChange={(e) => handleEditChange('worker', e.target.value)}
                                  className="form-input"
                                />
                              </div>
                              <div className="edit-group">
                                <label>작업 날짜</label>
                                <input
                                  type="date"
                                  value={editData.workDate}
                                  onChange={(e) => handleEditChange('workDate', e.target.value)}
                                  className="form-input"
                                />
                              </div>
                              <div className="edit-group">
                                <label>처리 방식</label>
                                <select
                                  value={editData.method}
                                  onChange={(e) => handleEditChange('method', e.target.value)}
                                  className="form-select"
                                >
                                  <option value="">선택</option>
                                  {INQUIRY_METHOD.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="edit-group full">
                              <label>작업 설명</label>
                              <textarea
                                value={editData.description}
                                onChange={(e) => handleEditChange('description', e.target.value)}
                                className="form-textarea"
                                rows={2}
                              />
                            </div>
                            <div className="edit-group full">
                              <label>해결 내용</label>
                              <textarea
                                value={editData.solution}
                                onChange={(e) => handleEditChange('solution', e.target.value)}
                                className="form-textarea"
                                rows={2}
                                placeholder="해결 방법을 입력하세요"
                              />
                            </div>
                            <div className="edit-actions">
                              <button className="btn btn-primary" onClick={saveEdit}>저장</button>
                              <button className="btn btn-secondary" onClick={cancelEdit}>취소</button>
                            </div>
                          </div>
                        ) : (
                          <div className="inquiry-detail">
                            <div className="detail-header">
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(inquiry);
                                }}
                              >
                                수정
                              </button>
                            </div>
                            <div className="detail-content">
                              <div className="detail-row">
                                <span className="detail-label">작업 날짜:</span>
                                <span>{inquiry.workDate || '미정'}</span>
                              </div>
                              <div className="detail-row">
                                <span className="detail-label">작업 설명:</span>
                                <span>{inquiry.description}</span>
                              </div>
                              {inquiry.solution && (
                                <div className="detail-row solution">
                                  <span className="detail-label">해결 내용:</span>
                                  <span>{inquiry.solution}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {inquiries.length > 10 && (
          <div className="more-link">
            <Link to="/inquiries">전체 {inquiries.length}건 보기</Link>
          </div>
        )}
      </div>
    </div>
  );
}
