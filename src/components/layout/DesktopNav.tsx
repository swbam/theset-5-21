
import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import UserProfile from '@/components/auth/UserProfile';

const DesktopNav = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex items-center gap-6">
      <nav className="flex items-center gap-6">
        <Link
          to="/"
          className={`text-sm font-medium ${isActive('/') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          Home
        </Link>
        <Link
          to="/artists"
          className={`text-sm font-medium ${isActive('/artists') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          Artists
        </Link>
        <Link
          to="/shows"
          className={`text-sm font-medium ${isActive('/shows') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          Upcoming Shows
        </Link>
        <Link
          to="/how-it-works"
          className={`text-sm font-medium ${isActive('/how-it-works') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          How It Works
        </Link>
      </nav>

      <UserProfile />
    </div>
  );
};

export default DesktopNav;
