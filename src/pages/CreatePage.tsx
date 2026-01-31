import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';

export default function CreatePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { createDocument } = useWiki();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    const id = createDocument(title, content);
    navigate(`/wiki/${id}`);
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="문서 제목"
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">내용</label>
          <textarea
            id="content"
            className="form-textarea"
            value={content}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            placeholder="문서 내용을 입력하세요..."
            rows={20}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            생성
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
