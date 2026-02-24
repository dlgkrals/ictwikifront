import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
      <h1 className="page-title" style={{ fontSize: '48px', margin: 0 }}>403</h1>
      <h2 style={{ margin: 0 }}>권한이 부족합니다</h2>
      <p style={{ color: '#54595d' }}>이 페이지에 접근할 권한이 없습니다.</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        홈으로 돌아가기
      </button>
    </div>
  );
}
