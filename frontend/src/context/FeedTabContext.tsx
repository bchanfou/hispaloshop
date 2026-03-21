import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type FeedTab = string;

interface FeedTabContextValue {
  activeTab: FeedTab;
  setActiveTab: (tab: FeedTab) => void;
}

const FeedTabContext = createContext<FeedTabContextValue | null>(null);

interface FeedTabProviderProps {
  children: ReactNode;
}

export function FeedTabProvider({ children }: FeedTabProviderProps) {
  const [activeTab, setTab] = useState<FeedTab>(() => {
    try { return localStorage.getItem('feedTab') || 'foryou'; }
    catch { return 'foryou'; }
  });

  const setActiveTab = useCallback((tab: FeedTab) => {
    setTab(tab);
    try { localStorage.setItem('feedTab', tab); } catch { /* restricted */ }
  }, []);

  return (
    <FeedTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </FeedTabContext.Provider>
  );
}

export function useFeedTab(): FeedTabContextValue {
  const ctx = useContext(FeedTabContext);
  return ctx ?? { activeTab: 'foryou', setActiveTab: () => {} };
}
