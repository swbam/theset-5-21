import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from './contexts/auth/AuthContext';
import { initGA, trackPageView } from './integrations/google-analytics';
import Index from './pages/Index';
import ArtistDetail from './pages/ArtistDetail';
import ShowDetail from './pages/ShowDetail';
import Shows from './pages/Shows';
import Artists from './pages/Artists';
import Search from './pages/Search';
import HowItWorks from './pages/HowItWorks';
import Login from './pages/Login';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Profile from './pages/Profile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MyArtists from './pages/MyArtists';
import CreateShow from './pages/CreateShow';
import NotFound from './pages/NotFound';
import TestJourney from './pages/TestJourney';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import AdminSetup from './pages/AdminSetup';
import Import from './pages/Import';
import { ThemeProvider } from 'next-themes';

// Google Analytics tracking ID
const GA_TRACKING_ID = "G-CNM6621HGW"; 

// RouteChangeTracker component to track page views
const RouteChangeTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  
  return null;
};

function App() {
  useEffect(() => {
    // Initialize Google Analytics
    initGA(GA_TRACKING_ID);
  }, []);

  return (
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <BrowserRouter>
          <TooltipProvider>
            <AuthProvider>
              {/* Add the route tracker component */}
              <RouteChangeTracker />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/artists/:id" element={<ArtistDetail />} />
                <Route path="/shows/:id" element={<ShowDetail />} />
                <Route path="/shows" element={<Shows />} />
                <Route path="/artists" element={<Artists />} />
                <Route path="/search" element={<Search />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/my-artists" element={<ProtectedRoute><MyArtists /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/create-show" element={<ProtectedRoute><CreateShow /></ProtectedRoute>} />
                <Route path="/import" element={<Import />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/setup" element={<AdminSetup />} />
                <Route path="/test-journey" element={<TestJourney />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </TooltipProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
