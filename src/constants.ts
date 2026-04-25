/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceType, ClinicType } from './types';

export const CLINICS: Record<ClinicType, { label: string; subLabel: string; color: string; initial: string }> = {
  MINIA: {
    label: 'عيادة المنيا',
    subLabel: 'العيادة الأولى',
    color: '#0ea5e9', // Sky 500
    initial: 'م',
  },
  BENI_AHMED: {
    label: 'عيادة بني أحمد',
    subLabel: 'العيادة الثانية',
    color: '#4f46e5', // Indigo 600
    initial: 'ب',
  },
};

export const SERVICES: Record<ServiceType, string> = {
  CHECKUP: 'كشف',
  FOLLOWUP: 'إعادة',
  IUD_INSERTION: 'تركيب لولب',
  IUD_REMOVAL: 'خلع لولب',
  CAPSULE_REMOVAL: 'خلع كبسولة',
  PREGNANCY_TEST: 'اختبار حمل',
};

export const DEFAULT_PRICES: Record<ClinicType, Record<ServiceType, number>> = {
  MINIA: {
    CHECKUP: 200,
    FOLLOWUP: 100,
    IUD_INSERTION: 500,
    IUD_REMOVAL: 300,
    CAPSULE_REMOVAL: 400,
    PREGNANCY_TEST: 150,
  },
  BENI_AHMED: {
    CHECKUP: 200,
    FOLLOWUP: 100,
    IUD_INSERTION: 500,
    IUD_REMOVAL: 300,
    CAPSULE_REMOVAL: 400,
    PREGNANCY_TEST: 150,
  },
};

export const DEFAULT_MANAGEMENT_PRICES: Record<ClinicType, Record<ServiceType, number>> = {
  MINIA: {
    CHECKUP: 20,
    FOLLOWUP: 10,
    IUD_INSERTION: 50,
    IUD_REMOVAL: 30,
    CAPSULE_REMOVAL: 40,
    PREGNANCY_TEST: 15,
  },
  BENI_AHMED: {
    CHECKUP: 20,
    FOLLOWUP: 10,
    IUD_INSERTION: 50,
    IUD_REMOVAL: 30,
    CAPSULE_REMOVAL: 40,
    PREGNANCY_TEST: 15,
  },
};

export const STORAGE_KEYS = {
  SETTINGS: 'clinic_app_settings',
  HISTORY: 'clinic_app_history',
  CURRENT_DAY_PATIENTS: 'clinic_app_current_day_patients',
};
