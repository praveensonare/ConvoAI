import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Role from './pages/Role';
import Knowledge from './pages/Knowledge';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/"
          element={<Layout />}
        >
          {/* Home page is accessible without authentication */}
          <Route index element={<Home />} />
          {/* Protected routes require authentication */}
          <Route path="role" element={<ProtectedRoute><Role /></ProtectedRoute>} />
          <Route path="kb" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
          <Route path="setting" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
