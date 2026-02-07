import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import { useWiki } from '../context/WikiContext';

export default function Header() {
  const { currentUser, logout } = useWiki();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (path: string) => {
    setShowDropdown(false);
    navigate(path);
  };

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
  };

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
        <div className="profile-wrapper" ref={dropdownRef}>
          <button
            className="profile-button"
            onClick={() => setShowDropdown(!showDropdown)}
            title={currentUser?.name}
          >
            <div className="profile-avatar">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
          </button>
          {showDropdown && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <span className="profile-dropdown-name">{currentUser?.name}</span>
                <span className="profile-dropdown-email">{currentUser?.email}</span>
              </div>
              <div className="profile-dropdown-menu">
                <button onClick={() => handleMenuClick('/my/info')}>
                  개인정보 조회
                </button>
                <button onClick={() => handleMenuClick('/my/password')}>
                  비밀번호 변경
                </button>
                <button onClick={() => handleMenuClick('/my/documents')}>
                  내가 쓴 문서
                </button>
                <button onClick={() => handleMenuClick('/my/inquiries')}>
                  내가 처리한 민원
                </button>
              </div>
              <div className="profile-dropdown-footer">
                <button onClick={handleLogout} className="logout-button">
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
