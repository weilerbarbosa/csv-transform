import { useEffect, createContext, useContext } from "react";

interface ThemeContextValue {
  theme: "dark";
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
