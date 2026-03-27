import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import DocumentEditor from '../components/editor/DocumentEditor';
import { DOCUMENT_CATEGORIES, type DocumentCategoryCode } from '../types';
import '../styles/editorstyle.css';

export default function CreatePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryCode, setCategoryCode] = useState<DocumentCategoryCode>('WORK');
  const [saving, setSaving] = useState(false);
  const { createDocument } = useWiki();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const id = await createDocument(title, content, categoryCode);
      navigate(`/wiki/${id}`);
    } catch (error) {
      console.error('Failed to create document:', error);
      alert('문서 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="editor-page" onSubmit={handleSubmit}>
      <div className="editor-topbar">
        <div className="editor-topbar-meta">
          <span className="editor-topbar-label">새 문서</span>
          <input
            className="editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문서 제목을 입력하세요"
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
            onClick={() => navigate('/')}
            disabled={saving}
          >
            취소
          </button>
          <button type="submit" className="editor-btn-save" disabled={saving}>
            {saving ? '생성 중...' : '저장'}
          </button>
        </div>
      </div>
      <DocumentEditor content={content} onChange={setContent} disabled={saving} />
    </form>
  );
}
