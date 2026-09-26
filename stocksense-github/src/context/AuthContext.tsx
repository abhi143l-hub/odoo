"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "INVENTORY_MANAGER" | "WAREHOUSE_STAFF";
  phone?: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserSession) => void;
  logout: () => void;
  switchDemoUser: (role: "ADMIN" | "INVENTORY_MANAGER" | "WAREHOUSE_STAFF") => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  switchDemoUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Read from localStorage & Cookies on client mount
    try {
      if (typeof window !== "undefined") {
        const storedToken = localStorage.getItem("stocksense_token");
        const storedUser = localStorage.getItem("stocksense_user");
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Ensure cookie is in sync for any middleware / server requests
          document.cookie = `stocksense_token=${storedToken}; path=/; max-age=604800; SameSite=Lax`;
        } else {
          setToken(null);
          setUser(null);
        }
      }
    } catch (e) {
      console.error("Auth initialization error:", e);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: UserSession) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== "undefined") {
      localStorage.setItem("stocksense_token", newToken);
      localStorage.setItem("stocksense_user", JSON.stringify(newUser));
      document.cookie = `stocksense_token=${newToken}; path=/; max-age=604800; SameSite=Lax`;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("stocksense_token");
      localStorage.removeItem("stocksense_user");
      document.cookie = "stocksense_token=; path=/; max-age=0;";
    }
    router.replace("/login");
  };

  const switchDemoUser = async (role: "ADMIN" | "INVENTORY_MANAGER" | "WAREHOUSE_STAFF") => {
    const roleEmails = {
      ADMIN: "admin@stocksense.io",
      INVENTORY_MANAGER: "manager@stocksense.io",
      WAREHOUSE_STAFF: "staff@stocksense.io",
    };

    const email = roleEmails[role];
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        login(data.token, data.user);
      }
    } catch (e) {
      console.error("Demo user switch error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, switchDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
