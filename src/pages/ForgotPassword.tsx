import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Brain, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy forgot password - just show success message
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg mb-3">
                <Brain className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Forgot Password?</h1>
              <p className="text-slate-500 text-sm">
                {isSubmitted
                  ? "Check your email for reset instructions"
                  : "Enter your email to reset your password"}
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail size={16} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-800 placeholder:text-slate-400 shadow-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <Mail size={20} />
                  Send Reset Link
                </button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </form>
            ) : (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={48} />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-slate-700 font-medium">
                    Password reset link sent!
                  </p>
                  <p className="text-slate-500 text-sm">
                    We've sent password reset instructions to <strong>{email}</strong>
                  </p>
                  <p className="text-slate-500 text-sm">
                    Please check your inbox and spam folder.
                  </p>
                </div>

                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-semibold"
                  >
                    <ArrowLeft size={20} />
                    Back to Sign In
                  </Link>

                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="w-full text-sm text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Didn't receive email? Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/80 text-sm mt-4">
          Demo version - Password reset is simulated
        </p>
      </div>
    </div>
  );
}
