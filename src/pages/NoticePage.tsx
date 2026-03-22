import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { renderLinesSafe } from '../components/InlineFormatter';
import { fileApi } from '../api/fileApi';
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

const NOTICE_SYNTAX_ITEMS = [
  { label: '제목 1', syntax: '# 제목', description: '큰 제목' },
  { label: '제목 2', syntax: '## 제목', description: '중간 제목' },
  { label: '제목 3', syntax: '### 제목', description: '작은 제목' },
  { label: '목록', syntax: '- 항목', description: '순서 없는 목록' },
  { label: '번호 목록', syntax: '1. 항목', description: '순서 있는 번호 목록' },
  { label: '굵게', syntax: '**텍스트**', description: '텍스트를 굵게 표시' },
  { label: '인라인 코드', syntax: '`코드`', description: '코드 텍스트' },
  { label: 'URL', syntax: 'https://example.com', description: 'URL 자동 링크' },
];

interface NoticeEditorProps {
  content: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function NoticeEditor({ content, onChange, disabled }: NoticeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    cursorPositionRef.current = e.target.selectionStart;
  };

  const handleCursorMove = () => {
    if (textareaRef.current) {
      cursorPositionRef.current = textareaRef.current.selectionStart;
    }
  };

  const insertSyntax = useCallback((syntax: string) => {
    const pos = cursorPositionRef.current;
    const newContent = content.slice(0, pos) + syntax + content.slice(pos);
    onChange(newContent);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = pos + syntax.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        cursorPositionRef.current = newPos;
      }
    });
  }, [content, onChange]);

  const uploadAndInsert = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const url = await fileApi.upload(file);
      insertSyntax(`![이미지](${url})`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }, [insertSyntax]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndInsert(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadAndInsert(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.items)
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();
    if (file) {
      e.preventDefault();
      uploadAndInsert(file);
    }
  };

  return (
    <div className="document-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <div className="editor-layout">
        <div className="editor-panel">
          <div className="editor-panel-header">
            편집기
            <button
              type="button"
              className="editor-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              title="이미지 업로드"
            >
              {uploading ? '업로드 중...' : '🖼 이미지'}
            </button>
          </div>
          <div
            className={`editor-drop-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <textarea
              ref={textareaRef}
              className="form-textarea editor-textarea"
              value={content}
              onChange={handleChange}
              onClick={handleCursorMove}
              onKeyUp={handleCursorMove}
              onPaste={handlePaste}
              placeholder="공지사항 내용을 입력하세요..."
              rows={20}
              disabled={disabled || uploading}
            />
          </div>
        </div>
        <div className="editor-panel">
          <div className="editor-panel-header">실시간 미리보기</div>
          <div className="editor-preview">
            {content.trim() ? (
              <div className="notice-content">{renderLinesSafe(content)}</div>
            ) : (
              <p className="empty-preview">미리보기할 내용이 없습니다.</p>
            )}
          </div>
        </div>
        <div className="editor-panel">
          <div className="syntax-helper">
            <div className="syntax-helper-header">
              <span className="syntax-helper-title">지원 문법</span>
            </div>
            <div className="syntax-helper-content">
              <p className="syntax-helper-tip">항목을 클릭하면 편집기의 커서 위치에 문법이 삽입됩니다.</p>
              <div className="syntax-category">
                <div className="syntax-items">
                  {NOTICE_SYNTAX_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="syntax-item"
                      onClick={() => insertSyntax(item.syntax)}
                    >
                      <div className="syntax-item-header">
                        <span className="syntax-label">{item.label}</span>
                        <span className="syntax-description">{item.description}</span>
                      </div>
                      <div className="syntax-item-body">
                        <div className="syntax-raw">
                          <code>{item.syntax}</code>
                        </div>
                        <div className="syntax-rendered">
                          {renderLinesSafe(item.syntax)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
            <NoticeEditor
              content={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
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
            <NoticeEditor
              content={editData.content}
              onChange={(value) => setEditData({ ...editData, content: value })}
              disabled={saving}
              rows={15}
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
