import { Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';

function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}초 전`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}일 전`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}달 전`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}년 전`;
}

export default function Sidebar() {
  const { documents } = useWiki();

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 10);

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">최근 수정</h3>
        <ul className="recent-list">
          {recentDocuments.map((doc) => (
            <li key={doc.id}>
              <Link to={`/wiki/${doc.id}`} className="recent-link">
                <span className="recent-title">{doc.title}</span>
                <span className="recent-time">{getRelativeTime(doc.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="sidebar-section">
        <h3 className="sidebar-title">도구</h3>
        <ul className="tool-list">
          <li>
            <Link to="/create" className="tool-link">
              새 문서 만들기
            </Link>
          </li>
          <li>
            <Link to="/" className="tool-link">
              메인 페이지
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
