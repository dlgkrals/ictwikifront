import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import DocumentEditor from '../components/editor/DocumentEditor';
import type { Document } from '../types';

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const { getDocument, updateDocument } = useWiki();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const doc = await getDocument(parseInt(id, 10));
      if (doc) {
        setDocument(doc);
        setTitle(doc.title);
        setContent(doc.content);
      }
      setLoading(false);
    };
    fetchDocument();
  }, [id, getDocument]);

  if (loading) {
    return (
      <div className="page loading">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="page not-found">
        <h1>문서를 찾을 수 없습니다</h1>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateDocument(document.id, title, content);
      navigate(`/wiki/${id}`);
    } catch (error) {
      console.error('Failed to update document:', error);
      alert('문서 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page edit-page">
      <h1 className="page-title">문서 수정</h1>
      <form onSubmit={handleSubmit} className="document-form">
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input
            type="text"
            id="title"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문서 제목"
            disabled={saving}
          />
        </div>
        <div className="form-group">
          <label>내용</label>
          <DocumentEditor
            content={content}
            onChange={setContent}
            disabled={saving}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/wiki/${id}`)}
            disabled={saving}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
