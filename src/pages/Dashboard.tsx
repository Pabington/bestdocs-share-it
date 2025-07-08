
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
          
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Meus Documentos</h2>
              <p className="text-gray-600">Gerencie seus arquivos e compartilhamentos</p>
            </div>
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
