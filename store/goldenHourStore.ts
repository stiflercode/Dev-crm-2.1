import { create } from 'zustand';

export interface GoldenHourAlert {
  id: string;
  complaintId: string;
  victimName: string;
  victimContact: string;
  category: string;
  subCategory: string;
  totalFraudAmount: number;
  incidentDateTime: string;
  registeredAt: string;
  registeredByName: string;
  minutesSinceIncident: number;
}

interface GoldenHourStore {
  alerts: GoldenHourAlert[];
  isModalOpen: boolean;
  activeAlert: GoldenHourAlert | null;

  // Actions
  pushAlert: (alert: GoldenHourAlert) => void;
  dismissAlert: (id: string) => void;
  openModal: (alert: GoldenHourAlert) => void;
  closeModal: () => void;
  clearAll: () => void;
}

export const useGoldenHourStore = create<GoldenHourStore>((set, get) => ({
  alerts: [],
  isModalOpen: false,
  activeAlert: null,

  pushAlert: (alert: GoldenHourAlert) => {
    set((s) => ({
      alerts: [alert, ...s.alerts.slice(0, 49)], // keep last 50
      isModalOpen: true,
      activeAlert: alert,
    }));
  },

  dismissAlert: (id: string) => {
    const { alerts } = get();
    const remaining = alerts.filter((a) => a.id !== id);
    set({
      alerts: remaining,
      isModalOpen: remaining.length > 0,
      activeAlert: remaining[0] ?? null,
    });
  },

  openModal: (alert: GoldenHourAlert) => set({ isModalOpen: true, activeAlert: alert }),

  closeModal: () => set({ isModalOpen: false }),

  clearAll: () => set({ alerts: [], isModalOpen: false, activeAlert: null }),
}));
