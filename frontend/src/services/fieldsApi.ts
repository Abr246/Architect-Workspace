export interface Field {
  id: string;
  name: string;
  location: string;
  surfaceType: string;
  pricePerHour: number;
  available: boolean;
}

export async function fetchAvailableFields(): Promise<Field[]> {
  const res = await fetch('/api/fields');
  if (!res.ok) {
    throw new Error(`Failed to load fields (status ${res.status})`);
  }
  const data = await res.json();
  return data.fields as Field[];
}
