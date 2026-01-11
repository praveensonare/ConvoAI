import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Key, Eye, EyeOff, Zap, MessageSquare } from 'lucide-react';

export default function Settings() {
  const [apiToken, setApiToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('apiToken');
    if (savedToken) {
      setApiToken(savedToken);
    }

    const streamingSetting = localStorage.getItem('isStreaming');
    if (streamingSetting === 'true') {
      setIsStreaming(true);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('apiToken', apiToken);
    localStorage.setItem('isStreaming', isStreaming.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleStreamingToggle = (checked: boolean) => {
    setIsStreaming(checked);
  };

  // Get message count and auth status for display
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userMessageCount = parseInt(localStorage.getItem('userMessageCount') || '0', 10);
  const maxMessages = isAuthenticated ? 40 : 7;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <SettingsIcon className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-blue-100 mt-1">
                  Configure your API token and platform preferences
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Key className="text-amber-600 flex-shrink-0" size={20} />
                <div>
                  <p className="text-amber-900 font-semibold text-sm">Secure Your Token</p>
                  <p className="text-amber-800 text-sm mt-1">
                    Your API token is stored locally in your browser. Never share it with anyone.
                    Get your token from your AI provider's dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Key size={16} />
                Your API Token
              </label>
              <div className="relative">
                <textarea
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  type={showToken ? 'text' : 'password'}
                  placeholder="sk-ant-api03-..."
                  className="w-full h-32 px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-mono text-sm"
                  style={{
                    WebkitTextSecurity: showToken ? 'none' : 'disc',
                    fontFamily: showToken ? 'monospace' : 'monospace'
                  }}
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-3 p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Characters: {apiToken.length} | Paste your complete API token here
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Token Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className={`font-semibold ${apiToken ? 'text-green-600' : 'text-slate-400'}`}>
                    {apiToken ? 'Configured' : 'Not Set'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Storage</p>
                  <p className="font-semibold text-blue-600">Local Browser</p>
                </div>
              </div>
            </div>

            {/* Response Settings */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Zap className="text-blue-600" size={20} />
                Response Settings
              </h3>
              <label className="flex items-center gap-3 cursor-pointer bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={isStreaming}
                  onChange={(e) => handleStreamingToggle(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Stream Responses (Real-time)</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Show AI responses as they are being generated instead of waiting for completion
                  </p>
                </div>
              </label>
            </div>

            {/* Usage Statistics */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={20} />
                Usage Statistics
              </h3>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">Messages Used</p>
                  <p className={`font-bold text-lg ${isAuthenticated ? 'text-green-600' : 'text-blue-600'}`}>
                    {userMessageCount} / {maxMessages}
                  </p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${isAuthenticated ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${(userMessageCount / maxMessages) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {isAuthenticated
                    ? `${maxMessages - userMessageCount} messages remaining in free tier`
                    : `Login to unlock ${maxMessages} total messages`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              {isSaved && (
                <span className="text-green-600 font-medium animate-pulse">
                  Saved successfully!
                </span>
              )}
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium"
              >
                <Save size={20} />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
