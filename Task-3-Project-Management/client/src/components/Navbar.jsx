import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  User,
  ShieldCheck,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Menu
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dbStatus, setDbStatus] = useState({ connected: false, loading: true });
  const [socketConnected, setSocketConnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Allow keyboard users to dismiss the mobile menu with Escape.
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    // Check DB health
    const checkHealth = async () => {
      try {
        const { data } = await api.get('/health');
        setDbStatus({ connected: data.database?.connected, loading: false });
      } catch (_) {
        setDbStatus({ connected: false, loading: false });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);

    // Socket status
    const s = getSocket();
    if (s.connected) setSocketConnected(true);
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    return () => {
      clearInterval(interval);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const handleLogout = () => {
    closeMobileMenu();
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <FolderKanban className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              NovaTask
            </span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Dashboard
              </Link>
            </nav>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicators & User Controls */}
        <div className="flex items-center space-x-4">
          {/* Live Status Badges */}
          <div className="hidden sm:flex items-center space-x-3 text-xs">
            {/* MongoDB Atlas badge */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${
                dbStatus.connected
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
              }`}
              title={dbStatus.connected ? 'MongoDB Atlas Connected' : 'Database Offline'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="font-mono">Atlas {dbStatus.connected ? 'Online' : 'Offline'}</span>
            </div>

            {/* Socket.io badge */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${
                socketConnected
                  ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/20'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/40'
              }`}
              title={socketConnected ? 'Real-time WebSocket Live' : 'WebSocket Reconnecting'}
            >
              {socketConnected ? <Wifi className="w-3 h-3 text-indigo-400" /> : <WifiOff className="w-3 h-3" />}
              <span className="font-mono">{socketConnected ? 'Live' : 'Syncing'}</span>
            </div>
          </div>

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow">
                  {user.name ? user.name[0] : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-medium text-slate-200">{user.name}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Mobile Navigation Backdrop */}
    {mobileMenuOpen && (
      <div
        className="fixed inset-0 top-16 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
        aria-hidden="true"
        onClick={closeMobileMenu}
      />
    )}

    {/* Mobile Navigation Drawer */}
    {mobileMenuOpen && (
      <div
        id="mobile-navigation"
        className="fixed top-16 left-0 right-0 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-b border-slate-800 bg-slate-950 p-4 shadow-2xl md:hidden"
      >
        <nav aria-label="Mobile navigation" className="flex flex-col space-y-2">
          {user && (
            <>
              <Link
                to="/"
                onClick={closeMobileMenu}
                className="px-4 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
            </>
          )}
          {!user && (
            <>
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={closeMobileMenu}
                className="px-4 py-3 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    )}
    </>
  );
}
