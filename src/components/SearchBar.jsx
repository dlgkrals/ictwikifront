import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { setSearchQuery, documents } = useWiki();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const suggestions = query.trim()
    ? documents.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query.toLowerCase()) ||
          doc.content.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const exactMatch = documents.find(
      (doc) => doc.title.toLowerCase() === query.toLowerCase()
    );

    if (exactMatch) {
      navigate(`/wiki/${exactMatch.id}`);
    } else {
      setSearchQuery(query);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
    setShowSuggestions(false);
    setQuery('');
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = () => {
    setShowSuggestions(false);
    setQuery('');
  };

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="문서 검색..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim() && setShowSuggestions(true)}
        />
        <button type="submit" className="btn btn-search">
          검색
        </button>
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="search-suggestions">
          {suggestions.map((doc) => (
            <li key={doc.id}>
              <Link
                to={`/wiki/${doc.id}`}
                className="suggestion-link"
                onClick={handleSuggestionClick}
              >
                <span className="suggestion-title">{doc.title}</span>
                <span className="suggestion-preview">
                  {doc.content.slice(0, 50)}...
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
