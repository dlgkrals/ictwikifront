import { useState, useMemo, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import type { TocItem, Section, WikiPart } from '../types';

export default function WikiPage() {
  const { id } = useParams<{ id: string }>();
  const { getDocument, deleteDocument, updateDocument, documents } = useWiki();
  const navigate = useNavigate();
  const document = getDocument(id || '');

  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const generateSectionId = (title: string, index: number): string => {
    return `section-${index}-${title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9가-힣-]/g, '')}`;
  };

  const tableOfContents = useMemo((): TocItem[] => {
    if (!document) return [];
    const lines = document.content.split('\n');
    const toc: TocItem[] = [];
    let sectionIndex = 0;

    lines.forEach((line) => {
      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);

      if (h1Match || h2Match || h3Match) {
        const title = h1Match ? h1Match[1] : h2Match ? h2Match[1] : h3Match![1];
        const level = h1Match ? 1 : h2Match ? 2 : 3;
        toc.push({
          title,
          level,
          id: generateSectionId(title, sectionIndex),
        });
        sectionIndex++;
      }
    });

    return toc;
  }, [document]);

  if (!document) {
    return (
      <div className="page not-found">
        <h1>문서를 찾을 수 없습니다</h1>
        <p>요청하신 문서가 존재하지 않습니다.</p>
        <Link to="/create" className="btn btn-primary">
          새 문서 만들기
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('정말 이 문서를 삭제하시겠습니까?')) {
      deleteDocument(id || '');
      navigate('/');
    }
  };

  const parseSections = (content: string): Section[] => {
    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section = { title: '', level: 0, content: [], startIndex: 0 };
    let sectionIndex = 0;

    lines.forEach((line, index) => {
      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);

      if (h1Match || h2Match || h3Match) {
        if (currentSection.title || currentSection.content.length > 0) {
          sections.push({ ...currentSection });
        }
        const title = h1Match ? h1Match[1] : h2Match ? h2Match[1] : h3Match![1];
        currentSection = {
          title,
          level: h1Match ? 1 : h2Match ? 2 : 3,
          content: [line],
          startIndex: index,
          id: generateSectionId(title, sectionIndex),
        };
        sectionIndex++;
      } else {
        currentSection.content.push(line);
      }
    });

    if (currentSection.title || currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  };

  const handleEditSection = (sectionIndex: number) => {
    const sections = parseSections(document.content);
    const section = sections[sectionIndex];
    setEditingSection(sectionIndex);
    setEditContent(section.content.join('\n'));
  };

  const handleSaveSection = () => {
    const sections = parseSections(document.content);
    const newSections = sections.map((section, index) => {
      if (index === editingSection) {
        return { ...section, content: editContent.split('\n') };
      }
      return section;
    });

    const newContent = newSections.map((s) => s.content.join('\n')).join('\n');
    updateDocument(id || '', document.title, newContent);
    setEditingSection(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
  };

  const parseWikiLinks = (text: string): WikiPart[] => {
    const parts: WikiPart[] = [];
    let lastIndex = 0;
    const regex = /\[\[([^\]|]+)\|([^\]]+)\]\]|\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }

      if (match[1] && match[2]) {
        parts.push({ type: 'link', display: match[1], target: match[2] });
      } else if (match[3]) {
        parts.push({ type: 'link', display: match[3], target: match[3] });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts;
  };

  const findDocumentByTitle = (title: string) => {
    return documents.find((doc) => doc.title.toLowerCase() === title.toLowerCase());
  };

  const renderTextWithLinks = (text: string): ReactNode[] => {
    const parts = parseWikiLinks(text);
    return parts.map((part, i) => {
      if (part.type === 'link') {
        const targetDoc = findDocumentByTitle(part.target);
        if (targetDoc) {
          return (
            <Link key={i} to={`/wiki/${targetDoc.id}`} className="wiki-link">
              {part.display}
            </Link>
          );
        }
        return (
          <span key={i} className="wiki-link-broken" title="문서가 존재하지 않습니다">
            {part.display}
          </span>
        );
      }
      const formatted = part.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  const renderLine = (line: string, index: number): ReactNode => {
    if (line.startsWith('### ')) {
      return <h3 key={index}>{renderTextWithLinks(line.slice(4))}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index}>{renderTextWithLinks(line.slice(3))}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={index}>{renderTextWithLinks(line.slice(2))}</h1>;
    }
    if (line.startsWith('- ')) {
      return <li key={index}>{renderTextWithLinks(line.slice(2))}</li>;
    }
    if (line.match(/^\d+\. /)) {
      return <li key={index}>{renderTextWithLinks(line.replace(/^\d+\. /, ''))}</li>;
    }
    if (line.startsWith('```')) {
      return null;
    }
    if (line.trim() === '') {
      return <br key={index} />;
    }
    return <p key={index}>{renderTextWithLinks(line)}</p>;
  };

  const scrollToSection = (sectionId: string) => {
    const element = window.document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderSections = () => {
    const sections = parseSections(document.content);

    return sections.map((section, sectionIndex) => {
      const isEditing = editingSection === sectionIndex;

      return (
        <div key={sectionIndex} id={section.id} className="wiki-section">
          <div className="section-header">
            {section.level > 0 && (
              <>
                {section.level === 1 && <h1>{section.title}</h1>}
                {section.level === 2 && <h2>{section.title}</h2>}
                {section.level === 3 && <h3>{section.title}</h3>}
              </>
            )}
            <button
              className="btn-edit-section"
              onClick={() => handleEditSection(sectionIndex)}
              title="이 섹션 편집"
            >
              [편집]
            </button>
          </div>

          {isEditing ? (
            <div className="section-edit-form">
              <textarea
                className="section-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
              />
              <div className="section-edit-actions">
                <button className="btn btn-primary" onClick={handleSaveSection}>
                  저장
                </button>
                <button className="btn btn-secondary" onClick={handleCancelEdit}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="section-content">
              {section.content.slice(section.level > 0 ? 1 : 0).map((line, lineIndex) =>
                renderLine(line, lineIndex)
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="page wiki-page">
      <div className="page-header">
        <h1 className="page-title">{document.title}</h1>
        <div className="page-actions">
          <Link to={`/edit/${id}`} className="btn btn-secondary">
            전체 수정
          </Link>
          <button onClick={handleDelete} className="btn btn-danger">
            삭제
          </button>
        </div>
      </div>
      <div className="page-meta">
        <span>생성일: {new Date(document.createdAt).toLocaleDateString('ko-KR')}</span>
        <span>수정일: {new Date(document.updatedAt).toLocaleDateString('ko-KR')}</span>
      </div>

      {tableOfContents.length > 1 && (
        <div className="toc-container">
          <div className="toc-header">목차</div>
          <ul className="toc-list">
            {tableOfContents.map((item, index) => (
              <li key={index} className={`toc-item toc-level-${item.level}`}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="page-content">{renderSections()}</div>
    </div>
  );
}
