import { useRef, useCallback, useState } from 'react';
import NamuMarkRenderer from '../namumark/NamuMarkRenderer';
import SyntaxHelperTab from './SyntaxHelperTab';
import { fileApi } from '../../api/fileApi';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  disabled?: boolean;
}

export default function DocumentEditor({ content, onChange, disabled }: DocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    const newContent = before + syntax + after;
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
      insertSyntax(`[[파일:${url}]]`);
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
              onChange={handleContentChange}
              onClick={handleCursorMove}
              onKeyUp={handleCursorMove}
              onPaste={handlePaste}
              placeholder="내용을 입력하세요..."
              rows={20}
              disabled={disabled || uploading}
            />
          </div>
        </div>
        <div className="editor-panel">
          <div className="editor-panel-header">실시간 미리보기</div>
          <div className="editor-preview">
            {content.trim() ? (
              <NamuMarkRenderer content={content} className="namu-content editor-preview-content" />
            ) : (
              <p className="empty-preview">미리보기할 내용이 없습니다.</p>
            )}
          </div>
        </div>
        <div className="editor-panel">
          <SyntaxHelperTab onInsert={insertSyntax} />
        </div>
      </div>
    </div>
  );
}
