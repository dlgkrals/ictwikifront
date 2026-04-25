import { useNavigate, useLocation } from 'react-router-dom';
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

// admin 여부에 따라 보여줄 서브메뉴 목록 반환
function getTimetableSubItems(isAdmin: boolean) {
  if (isAdmin) {
    return [
      { label: '시간표',      path: '/timetable/schedule'  },
      { label: '시간표 등록', path: '/timetable/register'  },
      { label: '보강',        path: '/timetable/makeup'    },
      { label: '강의실',      path: '/timetable/classroom' },
      { label: '소프트웨어',  path: '/timetable/software'  },
      { label: '호실별 SW',   path: '/timetable/swstatus'  },
    ];
  }
  return [
    { label: '시간표', path: '/timetable/schedule' },
    { label: '보강',   path: '/timetable/makeup'   },
  ];
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { documents, currentUser } = useWiki();
  const navigate = useNavigate();
  const location = useLocation();
  const isTimetableAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TA';
  const isLoggedIn = !!currentUser;
  const isOnTimetable = location.pathname.startsWith('/timetable');

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleLinkClick = (path: string) => {
    if (path !== '/stats' && !path.startsWith('/timetable')) onClose();
    navigate(path);
  };

  const isSubActive = (subPath: string) => {
    if (subPath === '/timetable/schedule') {
      return location.pathname === '/timetable' || location.pathname === '/timetable/schedule';
    }
    return location.pathname === subPath;
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <nav className="sidebar-nav">
          <button className="sidebar-nav-item" onClick={() => handleLinkClick('/stats')}>
            통계 보기
          </button>
          {isLoggedIn && (
            <>
              <button className="sidebar-nav-item" onClick={() => handleLinkClick('/timetable')}>
                시간표
              </button>
              {isOnTimetable && getTimetableSubItems(isTimetableAdmin).map((item) => (
                <button
                  key={item.path}
                  className={`sidebar-nav-item sidebar-nav-subitem${isSubActive(item.path) ? ' active' : ''}`}
                  onClick={() => handleLinkClick(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>

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
