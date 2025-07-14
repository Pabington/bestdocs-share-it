
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <header className="bg-card shadow-sm border-b px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Work Sans', letterSpacing: '-0.093em' }}>
          <span style={{ color: '#fc8110' }}>Best</span>
          <span style={{ color: '#545454' }}>docs</span>
        </h1>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground text-xs sm:text-sm">{user?.email}</span>
            </div>
            {isAdmin && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span className="hidden sm:inline">Administrador</span>
                <span className="sm:hidden">Admin</span>
              </Badge>
            )}
          </div>
          
          {/* Mobile user info */}
          <div className="sm:hidden flex items-center gap-2">
            {isAdmin && (
              <Badge variant="destructive" className="flex items-center gap-1 px-2 py-1">
                <Shield className="h-3 w-3" />
              </Badge>
            )}
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          
          <ThemeToggle />
          
          <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3">
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-sm">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
