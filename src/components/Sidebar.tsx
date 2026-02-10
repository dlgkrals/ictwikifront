import { useNavigate } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { documents } = useWiki();
  const navigate = useNavigate();

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleLinkClick = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-section">
          <h3 className="sidebar-title">통계</h3>
          <ul className="tool-list">
            <li>
              <button className="tool-link" onClick={() => handleLinkClick('/stats')}>
                통계 보기
              </button>
            </li>
          </ul>
        </div>
        <div className="sidebar-section">
          <h3 className="sidebar-title">최근 수정</h3>
          <ul className="recent-list">
            {recentDocuments.map((doc) => (
              <li key={doc.id}>
                <button
                  className="recent-link"
                  onClick={() => handleLinkClick(`/wiki/${doc.id}`)}
                >
                  <span className="recent-title">{doc.title}</span>
                  <span className="recent-time">{getRelativeTime(doc.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
