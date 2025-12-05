import { useState, useEffect } from 'react';
import { Save, Brain } from 'lucide-react';

export default function Role() {
  const [role, setRole] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
      setRole(savedRole);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('userRole', role);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Brain className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Role Definition</h1>
                <p className="text-purple-100 mt-1">
                  Define who you are and what you do to personalize your AI experience
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-sm">
                <span className="font-semibold">Pro Tip:</span> Describe your profession, expertise areas,
                and how you typically work. This helps the AI understand your context better.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Your Professional Role
              </label>
              <textarea
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Example: I am a software engineer specializing in web development. I work with React, TypeScript, and Node.js. I focus on building scalable applications and mentoring junior developers..."
                className="w-full h-96 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none resize-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all"
              />
              <p className="text-xs text-slate-500">
                Characters: {role.length} | Be as detailed as you like
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              {isSaved && (
                <span className="text-green-600 font-medium animate-pulse">
                  Saved successfully!
                </span>
              )}
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium"
              >
                <Save size={20} />
                Save Role
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
