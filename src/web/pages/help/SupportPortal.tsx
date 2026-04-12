import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import SupportPortalComponent from '../../components/SupportPortal';

export const SupportPortal: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <SupportPortalComponent />
      </div>
    </MainLayout>
  );
};
