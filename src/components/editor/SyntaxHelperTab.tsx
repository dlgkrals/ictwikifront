import { useState } from 'react';
import NamuMarkRenderer from '../namumark/NamuMarkRenderer';

interface SyntaxItem {
  label: string;
  syntax: string;
  description: string;
}

interface SyntaxCategory {
  id: string;
  category: string;
  items: SyntaxItem[];
}

const SYNTAX_EXAMPLES: SyntaxCategory[] = [
  {
    id: 'format',
    category: '텍스트 서식',
    items: [
      { label: '굵게', syntax: "'''텍스트'''", description: '텍스트를 굵게 표시' },
      { label: '기울임', syntax: "''텍스트''", description: '텍스트를 기울여 표시' },
      { label: '밑줄', syntax: '__텍스트__', description: '텍스트에 밑줄 표시' },
      { label: '취소선', syntax: '~~텍스트~~', description: '텍스트에 취소선 표시' },
      { label: '위첨자', syntax: '^^텍스트^^', description: '위첨자로 표시' },
      { label: '아래첨자', syntax: ',,텍스트,,', description: '아래첨자로 표시' },
    ],
  },
  {
    id: 'size',
    category: '텍스트 크기',
    items: [
      { label: '크게 (+1)', syntax: '{{{+1 텍스트}}}', description: '1단계 크게' },
      { label: '크게 (+2)', syntax: '{{{+2 텍스트}}}', description: '2단계 크게' },
      { label: '크게 (+3)', syntax: '{{{+3 텍스트}}}', description: '3단계 크게' },
      { label: '작게 (-1)', syntax: '{{{-1 텍스트}}}', description: '1단계 작게' },
      { label: '작게 (-2)', syntax: '{{{-2 텍스트}}}', description: '2단계 작게' },
    ],
  },
  {
    id: 'color',
    category: '텍스트 색상',
    items: [
      { label: '빨간색', syntax: '{{{#ff0000 텍스트}}}', description: '빨간색 텍스트' },
      { label: '파란색', syntax: '{{{#0000ff 텍스트}}}', description: '파란색 텍스트' },
      { label: '초록색', syntax: '{{{#008000 텍스트}}}', description: '초록색 텍스트' },
    ],
  },
  {
    id: 'link',
    category: '링크',
    items: [
      { label: '문서 링크', syntax: '[[문서이름]]', description: '다른 문서로 링크' },
      { label: '표시 텍스트', syntax: '[[문서이름|표시할 텍스트]]', description: '표시 텍스트가 다른 링크' },
      { label: '외부 링크', syntax: '[[https://example.com|사이트 이름]]', description: '외부 URL 링크' },
      { label: '문단 링크', syntax: '[[#문단명|표시 텍스트]]', description: '같은 문서 내 문단으로 이동' },
    ],
  },
  {
    id: 'heading',
    category: '제목 (문단)',
    items: [
      { label: '제목 2', syntax: '== 제목 ==', description: '2단계 제목' },
      { label: '제목 3', syntax: '=== 제목 ===', description: '3단계 제목' },
      { label: '제목 4', syntax: '==== 제목 ====', description: '4단계 제목' },
    ],
  },
  {
    id: 'list',
    category: '목록',
    items: [
      { label: '순서 없는 목록', syntax: ' * 항목 1\n * 항목 2\n * 항목 3', description: '글머리 기호 목록' },
      { label: '순서 있는 목록', syntax: ' 1. 항목 1\n 1. 항목 2\n 1. 항목 3', description: '번호 목록' },
    ],
  },
  {
    id: 'quote',
    category: '인용문',
    items: [
      { label: '인용문', syntax: '> 인용할 내용', description: '인용문 표시' },
      { label: '중첩 인용', syntax: '> 인용문\n>> 중첩 인용문', description: '중첩된 인용문' },
    ],
  },
  {
    id: 'table',
    category: '표 (테이블)',
    items: [
      { label: '기본 표', syntax: '|| 제목1 || 제목2 ||\n|| 내용1 || 내용2 ||', description: '기본 2x2 표' },
      { label: '셀 병합', syntax: '||<-2> 병합된 셀 ||\n|| 셀1 || 셀2 ||', description: '열 병합' },
      { label: '가운데 정렬', syntax: '||<:> 가운데 정렬 ||', description: '셀 가운데 정렬' },
      { label: '배경색', syntax: '||<bgcolor=#ffcccc> 빨간 배경 ||', description: '셀 배경색 지정' },
    ],
  },
  {
    id: 'folding',
    category: '접기/펼치기',
    items: [
      { label: '접기', syntax: '{{{#!folding [상세 내용]\n여기에 숨겨진 내용을 작성합니다.\n}}}', description: '접기/펼치기 블록' },
    ],
  },
  {
    id: 'footnote',
    category: '각주',
    items: [
      { label: '각주', syntax: '텍스트[* 각주 내용]', description: '각주 추가' },
      { label: '이름 각주', syntax: '텍스트[*출처 출처 내용]', description: '이름이 있는 각주' },
    ],
  },
  {
    id: 'etc',
    category: '기타',
    items: [
      { label: '수평선', syntax: '----', description: '수평 구분선' },
      { label: '줄바꿈', syntax: '[br]', description: '강제 줄바꿈' },
      { label: '문법 무효화', syntax: '\\[[문법 무효화]]', description: '문법 문자를 그대로 표시' },
    ],
  },
];

interface SyntaxHelperTabProps {
  onInsert: (syntax: string) => void;
}

export default function SyntaxHelperTab({ onInsert }: SyntaxHelperTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = activeFilter === 'all'
    ? SYNTAX_EXAMPLES
    : SYNTAX_EXAMPLES.filter((c) => c.id === activeFilter);

  const activeLabel = activeFilter === 'all'
    ? '전체'
    : SYNTAX_EXAMPLES.find((c) => c.id === activeFilter)?.category || '전체';

  const handleFilterSelect = (id: string) => {
    setActiveFilter(id);
    setFilterOpen(false);
  };

  const filterText = activeFilter === 'all' ? '필터' : `필터: ${activeLabel}`;

  return (
    <div className="syntax-helper">
      <div className="syntax-helper-header">
        <span className="syntax-helper-title">문법 도우미</span>
        <button
          type="button"
          className="syntax-filter-toggle"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <span>{filterText}</span>
          <span className={`syntax-filter-arrow ${filterOpen ? 'open' : ''}`}>{'\u25B6'}</span>
        </button>
      </div>
      {filterOpen && (
        <div className="syntax-filter-dropdown">
          <button
            type="button"
            className={`syntax-filter-option ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterSelect('all')}
          >
            전체
          </button>
          {SYNTAX_EXAMPLES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`syntax-filter-option ${activeFilter === cat.id ? 'active' : ''}`}
              onClick={() => handleFilterSelect(cat.id)}
            >
              {cat.category}
            </button>
          ))}
        </div>
      )}
      <div className="syntax-helper-content">
        <p className="syntax-helper-tip">
          항목을 클릭하면 편집기의 커서 위치에 문법이 삽입됩니다.
        </p>
        {filtered.map((category) => (
          <div key={category.id} className="syntax-category">
            {activeFilter === 'all' && (
              <h3 className="syntax-category-title">{category.category}</h3>
            )}
            <div className="syntax-items">
              {category.items.map((item) => (
                <div
                  key={item.label}
                  className="syntax-item"
                  onClick={() => onInsert(item.syntax)}
                >
                  <div className="syntax-item-header">
                    <span className="syntax-label">{item.label}</span>
                    <span className="syntax-description">{item.description}</span>
                  </div>
                  <div className="syntax-item-body">
                    <div className="syntax-raw">
                      <code>{item.syntax}</code>
                    </div>
                    <div className="syntax-rendered">
                      <NamuMarkRenderer content={item.syntax} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
