import { useState, type FormEvent } from 'react';
import { useWiki } from '../context/WikiContext';

export default function LoginPage() {
  const { login } = useWiki();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 테스트용: 아무 입력이나 로그인 성공
    login();
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>ICT Wiki</h1>
          <p>로그인이 필요합니다</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-group">
            <label htmlFor="username">아이디</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              placeholder="아이디를 입력하세요"
            />
          </div>
          <div className="login-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn">
            로그인
          </button>
        </form>
        <div className="login-footer">
          <p>테스트 모드: 아무 값이나 입력 후 로그인</p>
        </div>
      </div>
    </div>
  );
}
