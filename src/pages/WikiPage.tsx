import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { documentApi } from '../api';
import NamuMarkRenderer, { type ExtractedHeading } from '../components/namumark/NamuMarkRenderer';
import type { Document, TocItem, Section, DocumentHistory, DocumentLink } from '../types';
import { DOCUMENT_CATEGORY_MAP } from '../types';

type InfoTab = 'history' | 'backlinks' | 'outlinks';

export default function WikiPage() {
  const { id } = useParams<{ id: string }>();
  const { getDocument, deleteDocument, updateDocument } = useWiki();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [tableOfContents, setTableOfContents] = useState<TocItem[]>([]);

  const [infoTab, setInfoTab] = useState<InfoTab | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [historyList, setHistoryList] = useState<DocumentHistory[]>([]);
  const [backlinkList, setBacklinkList] = useState<DocumentLink[]>([]);
  const [outlinkList, setOutlinkList] = useState<DocumentLink[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
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

  const handleInfoTab = async (tab: InfoTab) => {
    if (!document) return;
    if (infoTab === tab) {
      setInfoTab(null);
      return;
    }
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
    } catch {
      // 에러 시 빈 목록 유지
    } finally {
      setInfoLoading(false);
    }
  };

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
    await updateDocument(document.id, document.title, newContent, document.categoryCode);
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
        <span className="meta-category">{DOCUMENT_CATEGORY_MAP[document.categoryCode]}</span>
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

      <div className="wiki-info-panel">
        <div className="wiki-info-tabs">
          {(['history', 'backlinks', 'outlinks'] as InfoTab[]).map((tab) => (
            <button
              key={tab}
              className={`wiki-info-tab ${infoTab === tab ? 'active' : ''}`}
              onClick={() => handleInfoTab(tab)}
            >
              {tab === 'history' && '수정 이력'}
              {tab === 'backlinks' && '역참조'}
              {tab === 'outlinks' && '나가는 링크'}
            </button>
          ))}
        </div>

        {infoTab && (
          <div className="wiki-info-content">
            {infoLoading && <p className="wiki-info-loading">불러오는 중...</p>}

            {!infoLoading && infoTab === 'history' && (
              historyList.length === 0 ? (
                <p className="wiki-info-empty">수정 이력이 없습니다.</p>
              ) : (
                <table className="wiki-history-table">
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
                        <tr key={h.id} className="wiki-history-row">
                          <td className="history-version">v{h.version}</td>
                          <td>{h.editorName}</td>
                          <td className="history-reason">{h.editReason || '-'}</td>
                          <td className="history-date">
                            {new Date(h.editedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td>
                            <button
                              className="btn-history-toggle"
                              onClick={() => setExpandedHistoryId(expandedHistoryId === h.id ? null : h.id)}
                            >
                              {expandedHistoryId === h.id ? '접기' : '내용 보기'}
                            </button>
                          </td>
                        </tr>
                        {expandedHistoryId === h.id && (
                          <tr key={`${h.id}-content`} className="wiki-history-content-row">
                            <td colSpan={5}>
                              <div className="wiki-history-content">
                                <NamuMarkRenderer content={h.content} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {!infoLoading && infoTab === 'backlinks' && (
              backlinkList.length === 0 ? (
                <p className="wiki-info-empty">이 문서를 참조하는 문서가 없습니다.</p>
              ) : (
                <ul className="wiki-link-list">
                  {backlinkList.map((link, i) => (
                    <li key={i}>
                      <Link to={`/wiki/${link.sourceDocumentId}`} className="wiki-link-item">
                        {link.sourceDocumentTitle}
                      </Link>
                      {link.displayText && link.displayText !== link.sourceDocumentTitle && (
                        <span className="wiki-link-display"> — "{link.displayText}"</span>
                      )}
                    </li>
                  ))}
                </ul>
              )
            )}

            {!infoLoading && infoTab === 'outlinks' && (
              outlinkList.length === 0 ? (
                <p className="wiki-info-empty">이 문서에서 나가는 링크가 없습니다.</p>
              ) : (
                <ul className="wiki-link-list">
                  {outlinkList.map((link, i) => (
                    <li key={i}>
                      <Link to={`/wiki/${link.targetDocumentId}`} className="wiki-link-item">
                        {link.targetDocumentTitle}
                      </Link>
                      {link.displayText && link.displayText !== link.targetDocumentTitle && (
                        <span className="wiki-link-display"> — "{link.displayText}"</span>
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
