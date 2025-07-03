
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

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
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700">{user?.email}</span>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};
