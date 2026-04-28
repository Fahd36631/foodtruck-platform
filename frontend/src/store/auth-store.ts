import { create } from "zustand";

type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  roleCode: string;
};

type AuthState = {
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (payload: { accessToken: string; user: SessionUser }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null })
}));
