import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Files from '@/pages/Files';
import ScanDocument from '@/pages/ScanDocument';
import SearchFiles from '@/pages/SearchFiles';
import Students from '@/pages/Students';
import StudentDetail from '@/pages/StudentDetail';
import QRScanner from '@/pages/QRScanner';
import Board from '@/pages/Board';

// NO-LOGIN / TESTING VERSION: no login is needed to reach the app — every
// route below is open. /login and /register still exist and work if you
// want to try them, but nothing redirects you there.
// Pair this with the OPEN-ACCESS supabase_schema.sql (policies that allow
// "public"), otherwise saves fail with a permissions error because there is
// no logged-in session.
const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/files" element={<Files />} />
        <Route path="/files/folder/:folderId" element={<Files />} />
        <Route path="/scan" element={<ScanDocument />} />
        <Route path="/scan-qr" element={<QRScanner />} />
        <Route path="/search" element={<SearchFiles />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:id" element={<StudentDetail />} />
        <Route path="/board" element={<Board />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
