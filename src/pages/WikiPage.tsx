import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import NamuMarkRenderer, { type ExtractedHeading } from '../components/namumark/NamuMarkRenderer';
import type { Document, TocItem, Section } from '../types';

export default function WikiPage() {
  const { id } = useParams<{ id: string }>();
  const { getDocument, deleteDocument, updateDocument } = useWiki();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [tableOfContents, setTableOfContents] = useState<TocItem[]>([]);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const doc = await getDocument(parseInt(id, 10));
      setDocument(doc);
      setLoading(false);
    };
    fetchDocument();
  }, [id, getDocument]);

  const handleHeadingsExtracted = useCallback((headings: ExtractedHeading[]) => {
    setTableOfContents(headings.map((h) => ({
      title: h.title,
      level: h.level,
      id: h.id,
    })));
  }, []);

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
        <p>요청하신 문서가 존재하지 않습니다.</p>
        <Link to="/create" className="btn btn-primary">
          새 문서 만들기
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm('정말 이 문서를 삭제하시겠습니까?')) {
      await deleteDocument(document.id);
      navigate('/');
    }
  };

  // NamuMark heading regex: == title == (2~6 levels)
  const HEADING_REGEX = /^(={2,6})\s+(.+?)\s+\1\s*$/;

  const parseSections = (content: string): Section[] => {
    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section = { title: '', level: 0, content: [], startIndex: 0 };
    let sectionIndex = 0;

    lines.forEach((line, index) => {
      const match = line.match(HEADING_REGEX);

      if (match) {
        if (currentSection.title || currentSection.content.length > 0) {
          sections.push({ ...currentSection });
        }
        const level = match[1].length;
        const title = match[2];
        currentSection = {
          title,
          level,
          content: [line],
          startIndex: index,
          id: `section-${sectionIndex}-${title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9가-힣-]/g, '')}`,
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

  const handleSaveSection = async () => {
    const sections = parseSections(document.content);
    const newSections = sections.map((section, index) => {
      if (index === editingSection) {
        return { ...section, content: editContent.split('\n') };
      }
      return section;
    });

    const newContent = newSections.map((s) => s.content.join('\n')).join('\n');
    await updateDocument(document.id, document.title, newContent);
    const updated = await getDocument(document.id);
    if (updated) setDocument(updated);
    setEditingSection(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
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
      // For rendering, skip the heading line (first line) if section has a heading
      const contentToRender = section.level > 0
        ? section.content.slice(1).join('\n')
        : section.content.join('\n');

      return (
        <div key={sectionIndex} id={section.id} className="wiki-section">
          <div className="section-header">
            {section.level > 0 && (
              <>
                {section.level === 2 && <h2>{section.title}</h2>}
                {section.level === 3 && <h3>{section.title}</h3>}
                {section.level === 4 && <h4>{section.title}</h4>}
                {section.level === 5 && <h5>{section.title}</h5>}
                {section.level === 6 && <h6>{section.title}</h6>}
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
              <NamuMarkRenderer content={contentToRender} />
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

      <div className="page-content">
        {editingSection !== null ? (
          renderSections()
        ) : (
          <>
            <NamuMarkRenderer
              content={document.content}
              onHeadingsExtracted={handleHeadingsExtracted}
            />
            <div className="wiki-sections-edit">
              {parseSections(document.content).map((section, sectionIndex) => (
                <div key={sectionIndex} className="section-edit-trigger">
                  {section.level > 0 && (
                    <button
                      className="btn-edit-section"
                      onClick={() => handleEditSection(sectionIndex)}
                      title="이 섹션 편집"
                    >
                      [편집]
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
