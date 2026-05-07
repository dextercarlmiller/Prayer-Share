import { create } from 'zustand';
import type { PrayerItemWithMeta } from '@/types';

interface PrayersState {
  myRequests: PrayerItemWithMeta[];
  sharedWithMe: PrayerItemWithMeta[];
  praiseReports: PrayerItemWithMeta[];
  archived: PrayerItemWithMeta[];
  isLoading: boolean;
  setMyRequests: (items: PrayerItemWithMeta[]) => void;
  setSharedWithMe: (items: PrayerItemWithMeta[]) => void;
  setPraiseReports: (items: PrayerItemWithMeta[]) => void;
  setArchived: (items: PrayerItemWithMeta[]) => void;
  setLoading: (loading: boolean) => void;
  updateItem: (id: string, updates: Partial<PrayerItemWithMeta>) => void;
  removeItem: (id: string) => void;
}

export const usePrayersStore = create<PrayersState>((set) => ({
  myRequests: [],
  sharedWithMe: [],
  praiseReports: [],
  archived: [],
  isLoading: false,
  setMyRequests: (items) => set({ myRequests: items }),
  setSharedWithMe: (items) => set({ sharedWithMe: items }),
  setPraiseReports: (items) => set({ praiseReports: items }),
  setArchived: (items) => set({ archived: items }),
  setLoading: (isLoading) => set({ isLoading }),
  updateItem: (id, updates) =>
    set((state) => ({
      myRequests: state.myRequests.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      sharedWithMe: state.sharedWithMe.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      praiseReports: state.praiseReports.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      archived: state.archived.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  removeItem: (id) =>
    set((state) => ({
      myRequests: state.myRequests.filter((i) => i.id !== id),
      sharedWithMe: state.sharedWithMe.filter((i) => i.id !== id),
      praiseReports: state.praiseReports.filter((i) => i.id !== id),
      archived: state.archived.filter((i) => i.id !== id),
    })),
}));
