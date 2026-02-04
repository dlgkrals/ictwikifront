import { useRef, useCallback } from 'react';
import NamuMarkRenderer from '../namumark/NamuMarkRenderer';
import SyntaxHelperTab from './SyntaxHelperTab';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  disabled?: boolean;
}

export default function DocumentEditor({ content, onChange, disabled }: DocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

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

  return (
    <div className="document-editor">
      <div className="editor-layout">
        <div className="editor-panel">
          <div className="editor-panel-header">편집기</div>
          <textarea
            ref={textareaRef}
            className="form-textarea editor-textarea"
            value={content}
            onChange={handleContentChange}
            onClick={handleCursorMove}
            onKeyUp={handleCursorMove}
            placeholder="나무위키 문법으로 문서를 작성하세요..."
            rows={20}
            disabled={disabled}
          />
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
