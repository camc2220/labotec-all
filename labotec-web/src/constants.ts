export const API_CONFIG = {
  // Priority: 1. VITE_API_BASE (User requested), 2. VITE_API_URL (Standard), 3. localhost:8080 (Default/Dev)
  // Use optional chaining (?.) to ensure we don't crash if env is undefined
  baseURL: (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || "http://localhost:8080",
  endpoints: {
    auth: "/api/auth",
    login: "/api/auth/login",
    appointments: "/api/appointments", 
    patients: "/api/patients",
    results: "/api/results",
    invoices: "/api/invoices",
    labTests: "/api/labtests",
    labOrders: "/api/laborders",
    users: "/api/users"
  },
};

export const COMPANY_INFO = {
  name: "Labotec SRL",
  slogan: "Laboratorio de análisis clínicos de confianza",
  address: "Apart. 1-A, Av. Miguel Díaz esq. Peatonal 17, Manz. 6, Santo Domingo Este 11802",
  phone: "(809) 695-1289",
  email: "contacto@labotec.com.do",
  schedule: "Lunes a Viernes: 8:00 AM - 6:00 PM | Sábados: 8:00 AM - 12:00 PM",
  googleMapsLink: "https://maps.google.com/?q=G5GP+PG+Santo+Domingo+Este"
};