
import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { FileUpload } from '@/components/dashboard/FileUpload';
import { DocumentList } from '@/components/dashboard/DocumentList';

const Dashboard = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-1 order-2 lg:order-1">
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
          
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Meus Documentos</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie seus arquivos e compartilhamentos</p>
            </div>
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
