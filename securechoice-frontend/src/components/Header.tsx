import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-primary' : 'text-secondary dark:text-dark-text';
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/login');
  };

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e7eef3] dark:border-dark-border bg-white dark:bg-dark-bg px-10 py-3 transition-colors duration-200">
        <div className="flex items-center gap-4 text-secondary dark:text-dark-text">
          <div className="size-4">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 4L44 12v10c0 12-8 24-20 28C12 46 4 34 4 22V12l20-8z"
                fill="currentColor"
              />
              <path
                d="M20 18l4 4 8-8"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-secondary dark:text-dark-text text-lg font-bold leading-tight tracking-[-0.015em]">RiskNinja</h2>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <div className="flex items-center gap-9">
            <Link className={`text-sm font-medium leading-normal hover:text-primary transition-colors ${isActive('/')}`} to="/">
              Home
            </Link>
            <Link className={`text-sm font-medium leading-normal hover:text-primary transition-colors ${isActive('/policies')}`} to="/policies">
              Policies
            </Link>
            <Link className={`text-sm font-medium leading-normal hover:text-primary transition-colors ${isActive('/chat-history')}`} to="/chat-history">
              Chat History
            </Link>
            <Link className={`text-sm font-medium leading-normal hover:text-primary transition-colors ${isActive('/support')}`} to="/support">
              Support
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                >
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <span className="text-sm font-medium text-secondary dark:text-dark-text">
                    {user.firstName}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-accent dark:text-dark-muted">
                    <path d="M7,10L12,15L17,10H7Z" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-200 dark:border-dark-border">
                      <div className="text-sm font-medium text-secondary dark:text-dark-text">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-accent dark:text-dark-muted">
                        {user.email}
                      </div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};

export default Header; 