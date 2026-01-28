import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';

export default function Header() {
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
      </div>
    </header>
  );
}
