import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { subscribePerfiles } from "../data/perfiles";
import type { PerfilesConfig, MiembroId } from "../types/models";

const PerfilesContext = createContext<PerfilesConfig>({});

export function PerfilesProvider({ children }: { children: ReactNode }) {
  const [perfiles, setPerfiles] = useState<PerfilesConfig>({});

  useEffect(() => {
    return subscribePerfiles(setPerfiles);
  }, []);

  return (
    <PerfilesContext.Provider value={perfiles}>
      {children}
    </PerfilesContext.Provider>
  );
}

// Devuelve el color custom del miembro, o el token CSS fallback.
export function useColorMiembro(memberId: MiembroId): string {
  const perfiles = useContext(PerfilesContext);
  return perfiles[memberId]?.color ?? `var(--member-${memberId})`;
}

export function usePerfiles(): PerfilesConfig {
  return useContext(PerfilesContext);
}
