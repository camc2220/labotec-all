export enum UserRole {
  Admin = "Admin",
  Recepcion = "Recepcion",
  Facturacion = "Facturacion",
  Paciente = "Paciente"
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  roles: string[];
  patientId?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    roles: string[];
    role: string;
    patientId?: string;
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  type: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'CheckedIn';
  notes?: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  resultValue: string;
  unit: string;
  releasedAt: string;
  pdfUrl?: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  number: string;
  amount: number;
  issuedAt: string;
  paid: boolean;
}

export interface LabTestService {
  id: string;
  code: string;
  name: string;
  description?: string; 
  defaultPrice: number;
  defaultUnit?: string;
  active: boolean;
  category?: string;
}

export interface LabOrderItem {
  id: string;
  labTestId: string;
  testCode: string;
  testName: string;
  status: string;
  price: number;
}

export interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  createdAt: string;
  status: string;
  notes?: string;
  items: LabOrderItem[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

// --- DTOs for Creation/Updates ---

export interface CreateUserDto {
  username: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  roles?: string[];
}

export interface CreatePatientDto {
  fullName: string;
  documentId: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  userName?: string; // Optional: Create user at same time
  password?: string;
}

export interface CreateLabOrderDto {
  patientId: string;
  testIds: string[];
  notes?: string;
}

export interface CreateLabResultDto {
    patientId: string;
    testName: string;
    resultValue: string;
    unit: string;
    releasedAt?: string;
    pdfUrl?: string;
}

export interface AppointmentParams {
    patientId?: string;
    from?: string;
    to?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}

export interface InvoiceParams {
    patientId?: string;
    paid?: boolean;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}