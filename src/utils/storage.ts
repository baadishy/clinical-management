/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, DailyRecord, PatientRecord } from '../types';
import { STORAGE_KEYS, DEFAULT_PRICES } from '../constants';

export const getSettings = (): AppSettings => {
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing settings', e);
    }
  }
  return { prices: { ...DEFAULT_PRICES } };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getCurrentDayPatients = (): PatientRecord[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DAY_PATIENTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing current day patients', e);
    }
  }
  return [];
};

export const saveCurrentDayPatients = (patients: PatientRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_DAY_PATIENTS, JSON.stringify(patients));
};

export const clearCurrentDayPatients = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_DAY_PATIENTS);
};

export const getHistory = (): DailyRecord[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing history', e);
    }
  }
  return [];
};

export const saveToHistory = (record: DailyRecord) => {
  const history = getHistory();
  // Check if record for this date and clinic already exists, if so update it, else add
  const existingIndex = history.findIndex(h => h.date === record.date && h.clinic === record.clinic);
  if (existingIndex >= 0) {
    history[existingIndex] = record;
  } else {
    history.push(record);
  }
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const saveHistory = (history: DailyRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const deleteHistoryRecord = (id: string) => {
  const history = getHistory();
  const updated = history.filter(h => h.id !== id);
  saveHistory(updated);
};
