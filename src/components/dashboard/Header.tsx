
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Work Sans', letterSpacing: '-0.093em' }}>
          <span style={{ color: '#fc8110' }}>Best</span>
          <span style={{ color: '#545454' }}>docs</span>
        </h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};
