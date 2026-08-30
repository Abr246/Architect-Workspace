export interface Field {
  id: string;
  name: string;
  location: string;
  surfaceType: string;
  pricePerHour: number;
  available: boolean;
}

// Walking skeleton: in-memory data so the endpoint is testable end-to-end
// before REQ-016 (booking database connection) is built. Replace with a
// real model/query once STORY-002 introduces persistence.
const FIELDS: Field[] = [
  { id: 'field-1', name: 'Riverside Pitch', location: 'North Park', surfaceType: 'grass', pricePerHour: 40, available: true },
  { id: 'field-2', name: 'Downtown Turf', location: 'Central Complex', surfaceType: 'artificial turf', pricePerHour: 55, available: true },
  { id: 'field-3', name: 'Lakeside Field', location: 'East Recreation Center', surfaceType: 'grass', pricePerHour: 35, available: false },
];

export function getAvailableFields(): Field[] {
  return FIELDS.filter((field) => field.available);
}
