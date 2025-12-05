import { useState, useEffect } from 'react';
import { Save, BookOpen } from 'lucide-react';

export default function Knowledge() {
  const [knowledge, setKnowledge] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKnowledge = localStorage.getItem('knowledgeBase');
    if (savedKnowledge) {
      setKnowledge(savedKnowledge);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('knowledgeBase', knowledge);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <BookOpen className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
                <p className="text-emerald-100 mt-1">
                  Share your expertise, documents, and information to enhance AI responses
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-emerald-800 text-sm">
                <span className="font-semibold">Knowledge Tip:</span> Include documentation, procedures,
                best practices, or any reference material that the AI should consider when assisting you.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Your Knowledge Repository
              </label>
              <textarea
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                placeholder="Example: Our team follows these coding standards:&#10;- Use TypeScript for type safety&#10;- Follow ESLint rules&#10;- Write unit tests for all functions&#10;&#10;Our API documentation:&#10;- Authentication uses JWT tokens&#10;- Base URL: https://api.example.com..."
                className="w-full h-96 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Characters: {knowledge.length} | Add as much detail as needed
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
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium"
              >
                <Save size={20} />
                Save Knowledge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
