import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Home from './pages/Home';
import Policies from './pages/Policies';
import ChatHistory from './pages/ChatHistory';
import Support from './pages/Support';
import Login from './pages/Login';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DocumentProvider>
          <Router>
            <div className="relative flex size-full min-h-screen flex-col bg-slate-50 dark:bg-dark-bg overflow-x-hidden font-sans transition-colors duration-200">
              <Routes>
                {/* Public route - Login */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected routes */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <div className="layout-container flex h-full grow flex-col">
                      <Header />
                      <div className="flex flex-1">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/policies" element={<Policies />} />
                          <Route path="/chat-history" element={<ChatHistory />} />
                          <Route path="/support" element={<Support />} />
                        </Routes>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </DocumentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
