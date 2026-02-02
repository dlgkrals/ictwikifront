import { useState, type FormEvent } from 'react';
import { useWiki } from '../context/WikiContext';

export default function LoginPage() {
  const { login, loading } = useWiki();
  const [emailPrefix, setEmailPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!emailPrefix.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const success = await login(emailPrefix, password);
      if (!success) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1>ICT Wiki</h1>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>ICT Wiki</h1>
          <p>로그인이 필요합니다</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          <div className="login-group">
            <label htmlFor="emailPrefix">학교 이메일</label>
            <div className="email-input-wrapper">
              <input
                type="text"
                id="emailPrefix"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value)}
                className="login-input email-prefix"
                placeholder="이메일 앞자리"
                disabled={isLoggingIn}
              />
              <span className="email-suffix">@g.seoil.ac.kr</span>
            </div>
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
              disabled={isLoggingIn}
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={isLoggingIn}>
            {isLoggingIn ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="login-footer">
          <p>서일대학교 ICT 융합대학 위키</p>
        </div>
      </div>
    </div>
  );
}
