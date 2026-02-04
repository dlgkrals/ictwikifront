import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { renderLinesSafe } from '../components/InlineFormatter';
import type { Notice, NoticeFormData } from '../types';

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

const emptyForm: NoticeFormData = {
  title: '',
  content: '',
};

// 공지사항 목록 페이지
function NoticeListPage() {
  const { notices, addNotice } = useWiki();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NoticeFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await addNotice(formData);
      setFormData(emptyForm);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add notice:', error);
      alert('공지사항 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page notice-page">
      <div className="page-header">
        <h1 className="page-title">공지사항</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '취소' : '새 공지'}
        </button>
      </div>

      {showForm && (
        <form className="notice-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              placeholder="공지사항 제목"
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label>내용 *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="form-textarea"
              rows={10}
              placeholder="공지사항 내용을 입력하세요 (마크다운 지원)"
              disabled={submitting}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '등록 중...' : '등록'}
          </button>
        </form>
      )}

      <div className="notice-stats">총 {notices.length}건</div>

      <ul className="notice-list-full">
        {notices.map((notice) => (
          <li key={notice.id} className="notice-list-item">
            <Link to={`/notices/${notice.id}`} className="notice-link">
              <div className="notice-info">
                <span className="notice-badge">공지</span>
                <span className="notice-title">{notice.title}</span>
              </div>
              <span className="notice-date">{getRelativeTime(notice.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 공지사항 상세 페이지
function NoticeDetailPage({ id }: { id: number }) {
  const navigate = useNavigate();
  const { getNotice, updateNotice, deleteNotice } = useWiki();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<NoticeFormData>({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchNotice = async () => {
      setLoading(true);
      const data = await getNotice(id);
      setNotice(data);
      setLoading(false);
    };
    fetchNotice();
  }, [id, getNotice]);

  if (loading) {
    return (
      <div className="page loading">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="page not-found">
        <h1>공지사항을 찾을 수 없습니다</h1>
        <Link to="/notices" className="btn btn-primary">
          목록으로
        </Link>
      </div>
    );
  }

  const startEdit = () => {
    setIsEditing(true);
    setEditData({ title: notice.title, content: notice.content });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData({ title: '', content: '' });
  };

  const saveEdit = async () => {
    if (!editData.title?.trim() || !editData.content?.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateNotice(id, editData);
      // 데이터 새로고침
      const updated = await getNotice(id);
      if (updated) setNotice(updated);
      setIsEditing(false);
      setEditData({ title: '', content: '' });
    } catch (error) {
      console.error('Failed to update notice:', error);
      alert('공지사항 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('정말 이 공지사항을 삭제하시겠습니까?')) {
      try {
        await deleteNotice(id);
        navigate('/notices');
      } catch (error) {
        console.error('Failed to delete notice:', error);
        alert('공지사항 삭제에 실패했습니다.');
      }
    }
  };


  return (
    <div className="page notice-detail-page">
      <div className="page-header">
        <Link to="/notices" className="btn btn-secondary">
          목록
        </Link>
        <div className="page-actions">
          {!isEditing && (
            <>
              <button onClick={startEdit} className="btn btn-secondary">
                수정
              </button>
              <button onClick={handleDelete} className="btn btn-danger">
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="notice-edit-form">
          <div className="form-group">
            <label>제목</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="form-input"
              disabled={saving}
            />
          </div>
          <div className="form-group">
            <label>내용</label>
            <textarea
              value={editData.content}
              onChange={(e) => setEditData({ ...editData, content: e.target.value })}
              className="form-textarea"
              rows={15}
              disabled={saving}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
            <button className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="notice-header">
            <h1 className="notice-title">{notice.title}</h1>
            <div className="notice-meta">
              <span>작성일: {new Date(notice.createdAt).toLocaleDateString('ko-KR')}</span>
              {notice.modifiedAt !== notice.createdAt && (
                <span>수정일: {new Date(notice.modifiedAt).toLocaleDateString('ko-KR')}</span>
              )}
            </div>
          </div>
          <div className="notice-content">
            {renderLinesSafe(notice.content)}
          </div>
        </>
      )}
    </div>
  );
}

// 메인 컴포넌트 - URL 파라미터에 따라 목록/상세 표시
export default function NoticePage() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <NoticeDetailPage id={parseInt(id, 10)} />;
  }

  return <NoticeListPage />;
}
