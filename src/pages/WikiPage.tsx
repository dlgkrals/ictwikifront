import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { documentApi } from '../api';
import NamuMarkRenderer from '../components/namumark/NamuMarkRenderer';
import type { Document, TocItem, Section, DocumentHistory, DocumentLink } from '../types';
import { DOCUMENT_CATEGORY_MAP } from '../types';
import '../styles/wikistyle.css';

type InfoTab = 'history' | 'backlinks' | 'outlinks';

const HEADING_REGEX = /^(={2,6})\s+(.+?)\s+\1\s*$/;

function parseSections(content: string): Section[] {
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
}

export default function WikiPage() {
  const { id } = useParams<{ id: string }>();
  const { getDocument, deleteDocument, updateDocument } = useWiki();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TocItem[]>([]);

  const [infoTab, setInfoTab] = useState<InfoTab | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [historyList, setHistoryList] = useState<DocumentHistory[]>([]);
  const [backlinkList, setBacklinkList] = useState<DocumentLink[]>([]);
  const [outlinkList, setOutlinkList] = useState<DocumentLink[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true);
      setInfoTab(null);
      setHistoryList([]);
      setBacklinkList([]);
      setOutlinkList([]);
      setExpandedHistoryId(null);
      const doc = await getDocument(parseInt(id, 10));
      setDocument(doc);
      setLoading(false);
    };
    fetchDocument();
  }, [id, getDocument]);

  useEffect(() => {
    if (!document) { setTableOfContents([]); return; }
    const sections = parseSections(document.content);
    const toc: TocItem[] = sections
      .filter(s => s.level > 0)
      .map(s => ({ title: s.title, level: s.level, id: s.id! }));
    setTableOfContents(toc);
  }, [document]);

  const handleInfoTab = async (tab: InfoTab) => {
    if (!document) return;
    if (infoTab === tab) { setInfoTab(null); return; }
    setInfoTab(tab);
    setInfoLoading(true);
    try {
      if (tab === 'history') {
        const data = await documentApi.getHistories(document.id);
        setHistoryList(data);
      } else if (tab === 'backlinks') {
        const data = await documentApi.getBacklinks(document.id);
        setBacklinkList(data);
      } else if (tab === 'outlinks') {
        const data = await documentApi.getOutlinks(document.id);
        setOutlinkList(data);
      }
    } catch { /* keep empty list */ } finally {
      setInfoLoading(false);
    }
  };

  if (loading) {
    return <div className="page loading"><p>로딩 중...</p></div>;
  }

  if (!document) {
    return (
      <div className="page not-found">
        <h1>문서를 찾을 수 없습니다</h1>
        <p>요청하신 문서가 존재하지 않습니다.</p>
        <Link to="/create" className="btn btn-primary">새 문서 만들기</Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm('정말 이 문서를 삭제하시겠습니까?')) {
      await deleteDocument(document.id);
      navigate('/');
    }
  };

  const handleEditSection = (sectionIndex: number) => {
    const sections = parseSections(document.content);
    const section = sections[sectionIndex];
    setEditingSection(sectionIndex);
    // Exclude the heading line — user edits body only
    const bodyLines = section.level > 0 ? section.content.slice(1) : section.content;
    setEditContent(bodyLines.join('\n'));
  };

  const handleSaveSection = async () => {
    if (isSaving || editingSection === null) return;
    setIsSaving(true);
    try {
      const sections = parseSections(document.content);
      const newSections = sections.map((section, index) => {
        if (index === editingSection) {
          const newBodyLines = editContent.split('\n');
          // Prepend heading line back for headed sections
          const newContent = section.level > 0
            ? [section.content[0], ...newBodyLines]
            : newBodyLines;
          return { ...section, content: newContent };
        }
        return section;
      });
      const newContent = newSections.map((s) => s.content.join('\n')).join('\n');
      await updateDocument(document.id, document.title, newContent, document.categoryCode);
      const updated = await getDocument(document.id);
      if (updated) setDocument(updated);
      setEditingSection(null);
      setEditContent('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
  };

  const scrollToSection = (sectionId: string) => {
    const element = window.document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderSections = () => {
    const sections = parseSections(document.content);
    return sections.map((section, sectionIndex) => {
      const isEditing = editingSection === sectionIndex;
      const bodyContent = section.level > 0
        ? section.content.slice(1).join('\n')
        : section.content.join('\n');

      return (
        <div
          key={sectionIndex}
          id={section.id || 'section-intro'}
          className={`wiki-section${section.level === 0 ? ' wiki-section-intro' : ''}`}
        >
          {section.level > 0 ? (
            <div className={`section-header section-header-lv${section.level}`}>
              {section.level === 2 && <h2>{section.title}</h2>}
              {section.level === 3 && <h3>{section.title}</h3>}
              {section.level === 4 && <h4>{section.title}</h4>}
              {section.level === 5 && <h5>{section.title}</h5>}
              {section.level === 6 && <h6>{section.title}</h6>}
              {!isEditing && (
                <button
                  className="wp-btn-edit-section"
                  onClick={() => handleEditSection(sectionIndex)}
                  title="이 섹션 편집"
                >
                  [편집]
                </button>
              )}
            </div>
          ) : (
            !isEditing && (
              <div className="section-header section-header-intro">
                <button
                  className="wp-btn-edit-section"
                  onClick={() => handleEditSection(sectionIndex)}
                  title="이 섹션 편집"
                >
                  [편집]
                </button>
              </div>
            )
          )}

          {isEditing ? (
            <div className="wp-section-form">
              <textarea
                className="wp-section-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={Math.max(10, editContent.split('\n').length + 2)}
              />
              <div className="wp-section-actions">
                <button
                  className="wp-section-save"
                  onClick={handleSaveSection}
                  disabled={isSaving}
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
                <button
                  className="wp-section-cancel"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="section-content">
              <NamuMarkRenderer content={bodyContent} />
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="page wiki-page">
      {/* Header */}
      <div className="wp-header">
        <div className="wp-header-left">
          <div className="wp-meta-row">
            <span className="wp-category-badge">{DOCUMENT_CATEGORY_MAP[document.categoryCode]}</span>
            <span className="wp-dates">
              생성 {new Date(document.createdAt).toLocaleDateString('ko-KR')} · 수정 {new Date(document.updatedAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <h1 className="wp-title">{document.title}</h1>
        </div>
        <div className="wp-actions">
          <Link to={`/edit/${id}`} className="wp-btn wp-btn-secondary">전체 수정</Link>
          <button onClick={handleDelete} className="wp-btn wp-btn-delete">삭제</button>
        </div>
      </div>

      {/* Table of Contents */}
      {tableOfContents.length > 1 && (
        <div className="wp-toc">
          <div className="wp-toc-label">목차</div>
          <ul className="wp-toc-list">
            {tableOfContents.map((item, index) => (
              <li key={index} className={`wp-toc-item wp-toc-lv${item.level}`}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      <div className="wp-content page-content">
        {renderSections()}
      </div>

      {/* Info Panel */}
      <div className="wp-info-panel">
        <div className="wp-tabs">
          {(['history', 'backlinks', 'outlinks'] as InfoTab[]).map((tab) => (
            <button
              key={tab}
              className={`wp-tab${infoTab === tab ? ' active' : ''}`}
              onClick={() => handleInfoTab(tab)}
            >
              {tab === 'history' && '수정 이력'}
              {tab === 'backlinks' && '역참조'}
              {tab === 'outlinks' && '나가는 링크'}
            </button>
          ))}
        </div>

        {infoTab && (
          <div className="wp-tab-body">
            {infoLoading && <p className="wp-info-loading">불러오는 중...</p>}

            {!infoLoading && infoTab === 'history' && (
              historyList.length === 0 ? (
                <p className="wp-info-empty">수정 이력이 없습니다.</p>
              ) : (
                <div className="wp-history-wrap">
                  <table className="wp-history-table">
                    <thead>
                      <tr>
                        <th>버전</th>
                        <th>수정자</th>
                        <th>수정 사유</th>
                        <th>수정일</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((h) => (
                        <>
                          <tr key={h.id}>
                            <td className="wp-history-version">v{h.version}</td>
                            <td>{h.editorName}</td>
                            <td className="wp-history-reason">{h.editReason || '-'}</td>
                            <td className="wp-history-date">
                              {new Date(h.editedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td>
                              <button
                                className="wp-history-toggle"
                                onClick={() => setExpandedHistoryId(expandedHistoryId === h.id ? null : h.id)}
                              >
                                {expandedHistoryId === h.id ? '접기' : '내용 보기'}
                              </button>
                            </td>
                          </tr>
                          {expandedHistoryId === h.id && (
                            <tr key={`${h.id}-content`} className="wp-history-expand-row">
                              <td colSpan={5}>
                                <div className="wp-history-expand-body">
                                  <NamuMarkRenderer content={h.content} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {!infoLoading && infoTab === 'backlinks' && (
              backlinkList.length === 0 ? (
                <p className="wp-info-empty">이 문서를 참조하는 문서가 없습니다.</p>
              ) : (
                <ul className="wp-link-list">
                  {backlinkList.map((link, i) => (
                    <li key={i}>
                      <Link to={`/wiki/${link.sourceDocumentId}`} className="wp-link-item">
                        {link.sourceDocumentTitle}
                      </Link>
                      {link.displayText && link.displayText !== link.sourceDocumentTitle && (
                        <span className="wp-link-display"> — "{link.displayText}"</span>
                      )}
                    </li>
                  ))}
                </ul>
              )
            )}

            {!infoLoading && infoTab === 'outlinks' && (
              outlinkList.length === 0 ? (
                <p className="wp-info-empty">이 문서에서 나가는 링크가 없습니다.</p>
              ) : (
                <ul className="wp-link-list">
                  {outlinkList.map((link, i) => (
                    <li key={i}>
                      <Link to={`/wiki/${link.targetDocumentId}`} className="wp-link-item">
                        {link.targetDocumentTitle}
                      </Link>
                      {link.displayText && link.displayText !== link.targetDocumentTitle && (
                        <span className="wp-link-display"> — "{link.displayText}"</span>
                      )}
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
