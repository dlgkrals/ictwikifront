import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { WikiProvider, useWiki } from './context/WikiContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import WikiPage from './pages/WikiPage';
import EditPage from './pages/EditPage';
import CreatePage from './pages/CreatePage';
import SearchPage from './pages/SearchPage';
import InquiryPage from './pages/InquiryPage';
import NoticePage from './pages/NoticePage';
import StatsPage from './pages/StatsPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import MyPage from './pages/MyPage';
import AdminPage from './pages/AdminPage';
import ForbiddenPage from './pages/ForbiddenPage';
import './styles/wiki.css';

function AppContent() {
  const { isAuthenticated } = useWiki();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  // 화면 크기 변경 시 사이드바 상태 자동 조정
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모바일에서 페이지 이동 시 사이드바 닫기
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // 403 권한 부족 → /forbidden 페이지로 이동
  useEffect(() => {
    const handleAccessDenied = () => navigate('/forbidden');
    window.addEventListener('access-denied', handleAccessDenied);
    return () => window.removeEventListener('access-denied', handleAccessDenied);
  }, [navigate]);

  // 인증 없이 접근 가능한 페이지
  if (location.pathname === '/reset-password' || location.pathname === '/verify-email') {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Routes>
    );
  }

  // 401 → 로그인 페이지 (루트)
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="main-container">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/wiki/:id" element={<WikiPage />} />
            <Route path="/edit/:id" element={<EditPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/inquiries" element={<InquiryPage />} />
            <Route path="/notices" element={<NoticePage />} />
            <Route path="/notices/:id" element={<NoticePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/my/:tab" element={<MyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/:tab" element={<AdminPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <WikiProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </WikiProvider>
  );
}

export default App;
