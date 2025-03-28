import { useEffect, useRef, createContext, useContext } from "react";
import { useLocation } from "react-router-dom";

const PreviousLocationContext = createContext<string | null>(null);

export const usePreviousLocation = () => useContext(PreviousLocationContext);

export function PreviousLocationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const previousLocationRef = useRef<string | null>(null);

  useEffect(() => {
    previousLocationRef.current = location.pathname;
  }, [location]);

  return (
    <PreviousLocationContext.Provider value={previousLocationRef.current}>{children}</PreviousLocationContext.Provider>
  );
}
