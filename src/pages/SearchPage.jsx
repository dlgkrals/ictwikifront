import { useSearchParams, Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { searchDocuments } = useWiki();
  const results = searchDocuments(query);

  return (
    <div className="page search-page">
      <h1 className="page-title">검색 결과</h1>
      <p className="search-query">
        "{query}" 검색 결과: {results.length}건
      </p>
      {results.length > 0 ? (
        <ul className="search-results">
          {results.map((doc) => (
            <li key={doc.id} className="search-result-item">
              <Link to={`/wiki/${doc.id}`}>
                <h3>{doc.title}</h3>
                <p className="result-preview">
                  {doc.content.slice(0, 150)}...
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="no-results">
          <p>검색 결과가 없습니다.</p>
          <Link to="/create" className="btn btn-primary">
            새 문서 만들기
          </Link>
        </div>
      )}
    </div>
  );
}
