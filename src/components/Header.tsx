import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { useWiki } from '../context/WikiContext';

export default function Header() {
  const { currentUser, logout } = useWiki();

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="logo">
          ICT Wiki
        </Link>
      </div>
      <div className="header-center">
        <SearchBar />
      </div>
      <div className="header-right">
        <Link to="/create" className="btn btn-primary">
          새 문서
        </Link>
        {currentUser && (
          <span className="header-user">{currentUser.name}</span>
        )}
        <button className="btn btn-secondary" onClick={logout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
