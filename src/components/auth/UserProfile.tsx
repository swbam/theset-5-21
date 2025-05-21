import React from 'react';
import Link from 'next/link';
import { LogOut, User, Settings, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth/AuthContext';

const UserProfile = () => {
  const { user, profile, logout, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">...</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button asChild variant="default">
        <Link href="/auth">Log in</Link>
      </Button>
    );
  }

  const getDisplayName = () => {
    if (profile?.username) return profile.username;
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getAvatarUrl = () => {
    return profile?.avatar_url || null;
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    }
    return getDisplayName().charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{getDisplayName()}</p>
            {user?.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        
        {/* Show Admin Link for admin users */}
        {profile?.is_admin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin" className="flex items-center">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/import" className="flex items-center">
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12"></path>
                  <path d="M8 11l4 4 4-4"></path>
                  <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"></path>
                </svg>
                Import Venues
              </Link>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
