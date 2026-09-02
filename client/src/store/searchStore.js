import { create } from 'zustand'

export const useSearchStore = create((set) => ({
  courseSearchTerm: '',
  setCourseSearchTerm: (term) => set({ courseSearchTerm: term }),
  clearCourseSearch: () => set({ courseSearchTerm: '' }),
}))
