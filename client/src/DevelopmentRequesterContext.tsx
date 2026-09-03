import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getRequesters, Requester } from "./api";

interface DevelopmentRequesterContextValue {
  requesters: Requester[];
  currentRequester: Requester | null;
  loading: boolean;
  error: string;
  selectRequester: (requester: Requester) => void;
}

const DevelopmentRequesterContext =
  createContext<DevelopmentRequesterContextValue | undefined>(undefined);

const STORAGE_KEY = "developmentRequesterId";

interface ProviderProps {
  children: ReactNode;
}

export function DevelopmentRequesterProvider({
  children,
}: ProviderProps) {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [currentRequester, setCurrentRequester] =
    useState<Requester | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequesters() {
      setLoading(true);
      setError("");

      try {
        const data = await getRequesters();
        setRequesters(data);

        const savedId = localStorage.getItem(STORAGE_KEY);

        if (savedId) {
          const savedRequester = data.find(
            (requester) => requester.id === Number(savedId)
          );

          if (savedRequester) {
            setCurrentRequester(savedRequester);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to retrieve requesters"
        );
      } finally {
        setLoading(false);
      }
    }

    loadRequesters();
  }, []);

  function selectRequester(requester: Requester) {
    setCurrentRequester(requester);
    localStorage.setItem(STORAGE_KEY, String(requester.id));
  }

  return (
    <DevelopmentRequesterContext.Provider
      value={{
        requesters,
        currentRequester,
        loading,
        error,
        selectRequester,
      }}
    >
      {children}
    </DevelopmentRequesterContext.Provider>
  );
}

export function useDevelopmentRequester() {
  const context = useContext(DevelopmentRequesterContext);

  if (!context) {
    throw new Error(
      "useDevelopmentRequester must be used within DevelopmentRequesterProvider"
    );
  }

  return context;
}
