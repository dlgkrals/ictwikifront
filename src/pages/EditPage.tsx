import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import DocumentEditor from '../components/editor/DocumentEditor';
import { DOCUMENT_CATEGORIES, type Document, type DocumentCategoryCode } from '../types';
import '../styles/editorstyle.css';

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const { getDocument, updateDocument } = useWiki();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryCode, setCategoryCode] = useState<DocumentCategoryCode>('WORK');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true);
      const doc = await getDocument(parseInt(id, 10));
      if (doc) {
        setDocument(doc);
        setTitle(doc.title);
        setContent(doc.content);
        setCategoryCode(doc.categoryCode);
      }
      setLoading(false);
    };
    fetchDocument();
  }, [id, getDocument]);

  if (loading) {
    return <div className="page loading"><p>로딩 중...</p></div>;
  }

  if (!document) {
    return <div className="page not-found"><h1>문서를 찾을 수 없습니다</h1></div>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateDocument(document.id, title, content, categoryCode);
      navigate(`/wiki/${id}`);
    } catch (error) {
      console.error('Failed to update document:', error);
      alert('문서 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="editor-page" onSubmit={handleSubmit}>
      <div className="editor-topbar">
        <div className="editor-topbar-meta">
          <span className="editor-topbar-label">문서 수정</span>
          <input
            className="editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문서 제목"
            disabled={saving}
          />
        </div>
        <div className="editor-topbar-controls">
          <select
            className="editor-category-select"
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value as DocumentCategoryCode)}
            disabled={saving}
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat.code} value={cat.code}>{cat.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="editor-btn-discard"
            onClick={() => navigate(`/wiki/${id}`)}
            disabled={saving}
          >
            취소
          </button>
          <button type="submit" className="editor-btn-save" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
      <DocumentEditor content={content} onChange={setContent} disabled={saving} />
    </form>
  );
}
