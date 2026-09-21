import { create } from 'zustand';

export type TelephonyState = 'IDLE' | 'AVAILABLE' | 'RINGING' | 'ON_CALL' | 'WRAP_UP';

export interface CallerInfo {
  phone: string;
  name?: string;
  callId: string;
}

interface TelephonyStore {
  state: TelephonyState;
  callerInfo: CallerInfo | null;
  callStartTime: Date | null;
  callDurationSeconds: number;

  // Actions
  goAvailable: () => void;
  goOffline: () => void;
  simulateIncomingCall: (caller: CallerInfo) => void;
  acceptCall: () => void;
  endCall: () => void;
  enterWrapUp: () => void;
  exitWrapUp: () => void;
  tickCallDuration: () => void;
}

export const useTelephonyStore = create<TelephonyStore>((set, get) => ({
  state: 'IDLE',
  callerInfo: null,
  callStartTime: null,
  callDurationSeconds: 0,

  goAvailable: () => set({ state: 'AVAILABLE' }),

  goOffline: () => set({ state: 'IDLE', callerInfo: null, callStartTime: null, callDurationSeconds: 0 }),

  simulateIncomingCall: (caller: CallerInfo) => {
    set({ state: 'RINGING', callerInfo: caller });
  },

  acceptCall: () => {
    set({ state: 'ON_CALL', callStartTime: new Date(), callDurationSeconds: 0 });
  },

  endCall: () => {
    set({ state: 'WRAP_UP' });
  },

  enterWrapUp: () => {
    set({ state: 'WRAP_UP' });
  },

  exitWrapUp: () => {
    set({
      state: 'AVAILABLE',
      callerInfo: null,
      callStartTime: null,
      callDurationSeconds: 0,
    });
  },

  tickCallDuration: () => {
    const { state } = get();
    if (state === 'ON_CALL') {
      set((s) => ({ callDurationSeconds: s.callDurationSeconds + 1 }));
    }
  },
}));
