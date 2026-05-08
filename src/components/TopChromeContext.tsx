import React, { createContext, useContext } from 'react';

const TopChromeManagedContext = createContext(false);

export function TopChromeProvider({
  value = true,
  children,
}: {
  value?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TopChromeManagedContext.Provider value={value}>
      {children}
    </TopChromeManagedContext.Provider>
  );
}

export function useTopChromeManaged() {
  return useContext(TopChromeManagedContext);
}

