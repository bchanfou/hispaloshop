import { createContext, useContext, useState, useCallback } from 'react';

const FeedTabContext = createContext(null);

export function FeedTabProvider({ children }) {
  const [activeTab, setTab] = useState(() => {
    try { return localStorage.getItem('feedTab') || 'foryou'; }
    catch { return 'foryou'; }
  });

  const setActiveTab = useCallback((tab) => {
    setTab(tab);
    try { localStorage.setItem('feedTab', tab); } catch { /* restricted */ }
  }, []);

  return (
    <FeedTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </FeedTabContext.Provider>
  );
}

export function useFeedTab() {
  const ctx = useContext(FeedTabContext);
  return ctx ?? { activeTab: 'foryou', setActiveTab: () => {} };
}
