export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
  date: string; // YYYY-MM-DD
  recurrence?: RecurrenceType;
}

export interface AISummaryRequest {
  events: CalendarEvent[];
  prompt?: string;
}
