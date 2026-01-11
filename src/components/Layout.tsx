import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Brain, BookOpen, Settings, User, LogOut, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ConversationList from './ConversationList';
import { getCurrentConversationId } from '../services/conversationStorage';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string | null>(
    getCurrentConversationId()
  );
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Brain, label: 'Role', path: '/role' },
    { icon: BookOpen, label: 'Knowledge', path: '/kb' },
    { icon: Settings, label: 'Settings', path: '/setting' },
  ];

  const handleNavigation = (path: string) => {
    // If navigating to home, reset to welcome screen
    if (path === '/') {
      setCurrentConvId(null);
      navigate('/?welcome=true');
    } else {
      navigate(path);
    }
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConvId(conversationId);
    // Navigate to home with conversation ID in query param
    navigate(`/?conv=${conversationId}`);
    // Close sidebar on mobile
    setIsSidebarOpen(false);
  };

  const handleNewConversation = () => {
    setCurrentConvId(null);
    // Navigate to home without conversation ID to create new
    navigate('/?new=true');
    // Close sidebar on mobile
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 ${
          isSidebarCollapsed ? 'lg:w-20 w-72' : 'w-72'
        } bg-white border-r border-slate-200 shadow-xl transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Desktop collapse button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-100 transition-colors shadow-md z-50"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 flex flex-col p-6">
          <div className="mb-8">
            <div className={`flex items-center gap-3 px-3 py-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Brain className="text-white" size={24} />
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800">ConvoAI</h1>
                  <p className="text-xs text-slate-500">Platform</p>
                </div>
              )}
            </div>
          </div>

          <nav className="space-y-2 mb-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:scale-102'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* My Conversations Section */}
          {location.pathname === '/' && !isSidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-3">
                My Conversations
              </h2>
              <ConversationList
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                currentConversationId={currentConvId}
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 relative">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-all duration-200 ${
                  isSidebarCollapsed ? 'justify-center' : ''
                }`}
                title={isSidebarCollapsed ? 'My Profile' : ''}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <User className="text-white" size={20} />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800">My Profile</p>
                    <p className="text-xs text-slate-500">View & Manage</p>
                  </div>
                )}
              </button>

              {isProfileOpen && (
                <div className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden ${
                  isSidebarCollapsed ? 'left-4' : 'left-4 right-4'
                }`}>
                  <button
                    onClick={() => {
                      handleNavigation('/profile');
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <User size={18} className="text-slate-600" />
                    <span className="text-slate-700 font-medium">Profile</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600 whitespace-nowrap"
                  >
                    <LogOut size={18} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => handleNavigation('/login')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
              title={isSidebarCollapsed ? 'Login' : ''}
            >
              <User className="text-white" size={20} />
              {!isSidebarCollapsed && (
                <span className="font-medium">Login / Sign Up</span>
              )}
            </button>
          )}
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
