import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Brain, BookOpen, Settings, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ConversationList from './ConversationList';
import { getCurrentConversationId } from '../services/conversationStorage';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string | null>(
    getCurrentConversationId()
  );
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
  ];

  const handleNavigation = (path: string) => {
    if (path === '/') {
      setCurrentConvId(null);
      navigate('/?welcome=true');
    } else {
      navigate(path);
    }
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConvId(conversationId);
    navigate(`/?conv=${conversationId}`);
    setIsSidebarOpen(false);
  };

  const handleNewConversation = () => {
    setCurrentConvId(null);
    navigate('/?new=true');
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg flex-shrink-0">
                <Brain className="text-white" size={24} />
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800">UOB ConvoAI</h1>
                  <p className="text-xs text-slate-500">Retail Leadership</p>
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
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30 scale-105'
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

        <div className="p-4 border-t border-slate-200">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">UOB</span>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">Retail Leadership</p>
                <p className="text-xs text-slate-400">Conversational AI</p>
              </div>
            )}
          </div>
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
