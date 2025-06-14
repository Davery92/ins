import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Home from './pages/Home';
import Policies from './pages/Policies';
import Research from './pages/ChatHistory';
import Support from './pages/Support';
import Admin from './pages/Admin';
import Login from './pages/Login';
import RegisterAdmin from './pages/RegisterAdmin';
import SystemAdmin from './pages/SystemAdmin';
import Comparison from './pages/Comparison';
import ChangePassword from './pages/ChangePassword';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DocumentProvider>
          <Router>
            <div className="relative flex h-screen w-screen flex-col bg-slate-50 dark:bg-dark-bg font-sans transition-colors duration-200">
              <Routes>
                {/* Public route - Login */}
                <Route path="/login" element={<Login />} />
                <Route path="/register-admin" element={<RegisterAdmin />} />
                
                {/* Protected routes */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <div className="flex h-full w-full flex-col">
                      <Header />
                      <div className="flex flex-1">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/policies" element={<Policies />} />
                          <Route path="/comparison" element={<Comparison />} />
                          <Route path="/research" element={<Research />} />
                          <Route path="/support" element={<Support />} />
                          <Route path="/admin" element={<Admin />} />
                          <Route path="/sysadmin" element={<SystemAdmin />} />
                          <Route path="/change-password" element={<ChangePassword />} />
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
