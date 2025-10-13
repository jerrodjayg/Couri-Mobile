import { create } from 'zustand'

export const useInvitesStore = create((set) => ({
  transactions: new Map(),
  upsertTransaction: (transaction) =>
    set((state) => {
      const newMap = new Map(state.transactions)
      newMap.set(transaction.id, { ...newMap.get(transaction.id), ...transaction })
      return { transactions: newMap }
    }),
  setAccepted: (id, acceptedAt) =>
    set((state) => {
      const newMap = new Map(state.transactions)
      const existing = newMap.get(id)
      if (existing) {
        newMap.set(id, { ...existing, status: 'accepted', acceptedAt })
      }
      return { transactions: newMap }
    }),
}))

