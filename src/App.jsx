import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WikiProvider } from './context/WikiContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import WikiPage from './pages/WikiPage';
import EditPage from './pages/EditPage';
import CreatePage from './pages/CreatePage';
import SearchPage from './pages/SearchPage';
import InquiryPage from './pages/InquiryPage';
import './styles/wiki.css';

function App() {
  return (
    <WikiProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <div className="main-container">
            <Sidebar />
            <main className="content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/wiki/:id" element={<WikiPage />} />
                <Route path="/edit/:id" element={<EditPage />} />
                <Route path="/create" element={<CreatePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/inquiries" element={<InquiryPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </WikiProvider>
  );
}

export default App;
