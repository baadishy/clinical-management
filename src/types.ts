/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ServiceType = 
  | 'CHECKUP' // كشف
  | 'FOLLOWUP' // إعادة
  | 'IUD_INSERTION' // تركيب لولب
  | 'IUD_REMOVAL' // خلع لولب
  | 'CAPSULE_REMOVAL' // خلع كبسولة
  | 'PREGNANCY_TEST'; // اختبار حمل

export type ClinicType = 'BENI_AHMED' | 'MINIA';

export interface ServicePrice {
  service: ServiceType;
  price: number;
  label: string;
}

export interface PatientRecord {
  id: string;
  timestamp: number;
  clinic: ClinicType;
  service: ServiceType;
  price: number;
}

export interface DailyRecord {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  clinic: ClinicType | 'BOTH';
  totalPatients: number;
  patientsByService: Record<ServiceType, number>;
  revenueByService: Record<ServiceType, number>;
  patientsByClinic: Record<ClinicType, number>;
  revenueByClinic: Record<ClinicType, number>;
  allPatients?: PatientRecord[]; // Optional: full patient list for history
  totalGrossRevenue: number;
  tithe: number;
  management: number;
  totalNetRevenue: number;
  isLocked: boolean; // Once day is "ended" and saved to history
}

export interface AppSettings {
  prices: Record<ClinicType, Record<ServiceType, number>>;
  managementPrices: Record<ClinicType, Record<ServiceType, number>>;
}
