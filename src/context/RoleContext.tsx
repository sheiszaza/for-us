import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../types';
import { clearCurrentRole, getCurrentRole, setCurrentRole } from '../lib/roles';

type RoleContextValue = {
  role: Role | null;
  selectRole: (role: Role) => void;
  logout: () => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

type RoleProviderProps = {
  children: ReactNode;
};

export function RoleProvider({ children }: RoleProviderProps) {
  const [role, setRole] = useState<Role | null>(() => getCurrentRole());

  const selectRole = useCallback((nextRole: Role) => {
    setCurrentRole(nextRole);
    setRole(nextRole);
  }, []);

  const logout = useCallback(() => {
    clearCurrentRole();
    setRole(null);
  }, []);

  const value = useMemo<RoleContextValue>(() => ({ role, selectRole, logout }), [logout, role, selectRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export const useRole = () => {
  const value = useContext(RoleContext);

  if (!value) {
    throw new Error('useRole must be used within RoleProvider');
  }

  return value;
};
