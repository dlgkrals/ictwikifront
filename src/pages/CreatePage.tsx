import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import DocumentEditor from '../components/editor/DocumentEditor';
import { DOCUMENT_CATEGORIES, type DocumentCategoryCode } from '../types';

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
    <div className="page create-page">
      <h1 className="page-title">새 문서 만들기</h1>
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
          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            className="form-select"
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value as DocumentCategoryCode)}
            disabled={saving}
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.label}
              </option>
            ))}
          </select>
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
            {saving ? '생성 중...' : '생성'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={saving}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
