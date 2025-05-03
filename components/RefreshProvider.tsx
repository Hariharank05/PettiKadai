import React, { createContext, useContext } from 'react';

// Define Refresh Context Type
interface RefreshContextType {
  refreshForm: () => void;
}

// Create Refresh Context
const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

// Refresh Provider Component
export const RefreshProvider: React.FC<{
  children: React.ReactNode;
  refreshForm?: () => void; // Optional override for refreshForm
}> = ({ children, refreshForm }) => {
  // Default refreshForm implementation (can be overridden)
  const defaultRefreshForm = () => {
    console.log('Default refreshForm called');
  };

  return (
    <RefreshContext.Provider value={{ refreshForm: refreshForm || defaultRefreshForm }}>
      {children}
    </RefreshContext.Provider>
  );
};

// Custom Hook to Access Refresh Context
export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
