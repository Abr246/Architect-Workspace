import { db } from '../db/connection';

export interface Field {
  id: string;
  name: string;
  location: string;
  surfaceType: string;
  pricePerHour: number;
  available: boolean;
  sizeFormat: string;
  description: string;
  amenities: string[];
}

interface FieldRow {
  id: string;
  name: string;
  location: string;
  surface_type: string;
  price_per_hour: number;
  available: number;
  size_format: string;
  description: string;
  amenities: string;
}

function rowToField(row: FieldRow): Field {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    surfaceType: row.surface_type,
    pricePerHour: row.price_per_hour,
    available: row.available === 1,
    sizeFormat: row.size_format,
    description: row.description,
    amenities: JSON.parse(row.amenities) as string[],
  };
}

const SEED_FIELDS: Field[] = [
  {
    id: 'field-1',
    name: 'Riverside Pitch',
    location: 'North Park',
    surfaceType: 'grass',
    pricePerHour: 40,
    available: true,
    sizeFormat: '11v11',
    description:
      'A full-size grass pitch nestled along the river in North Park, popular for competitive league matches and weekend pickup games.',
    amenities: ['Parking', 'Restrooms', 'Lighting'],
  },
  {
    id: 'field-2',
    name: 'Downtown Turf',
    location: 'Central Complex',
    surfaceType: 'artificial turf',
    pricePerHour: 55,
    available: true,
    sizeFormat: '7v7',
    description:
      'A premium artificial turf field in the heart of the city, ideal for fast-paced 7-a-side games with reliable footing in any weather.',
    amenities: ['Parking', 'Locker rooms', 'Restrooms', 'Lighting', 'Seating'],
  },
  {
    id: 'field-3',
    name: 'Lakeside Field',
    location: 'East Recreation Center',
    surfaceType: 'grass',
    pricePerHour: 35,
    available: false,
    sizeFormat: '5v5',
    description:
      'A compact grass field by the lake at the East Recreation Center, perfect for small-sided games and casual practice.',
    amenities: ['Restrooms', 'Seating'],
  },
];

// Seeds these 3 starter fields once, only into a genuinely empty table
// (a fresh database file, or the fresh in-memory database each test file
// gets). Never re-seeds over real data that's already there.
function ensureSeeded(): void {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM fields').get() as { count: number };
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO fields (id, name, location, surface_type, price_per_hour, available, size_format, description, amenities)
     VALUES (@id, @name, @location, @surfaceType, @pricePerHour, @available, @sizeFormat, @description, @amenities)`,
  );
  const insertAll = db.transaction((fields: Field[]) => {
    for (const field of fields) {
      insert.run({ ...field, available: field.available ? 1 : 0, amenities: JSON.stringify(field.amenities) });
    }
  });
  insertAll(SEED_FIELDS);
}
ensureSeeded();

// A database file from before size/description/amenities existed has these
// 3 rows already, but without that content (just the migration's empty-
// string/empty-array defaults) - this keeps the real authored content in
// sync on every startup, the same way the code itself is the source of
// truth for it. Never touches available/pricePerHour/name/location/
// surfaceType, since nothing in this app can change those at runtime
// either way.
function ensureFieldDetailsBackfilled(): void {
  const update = db.prepare(
    'UPDATE fields SET size_format = @sizeFormat, description = @description, amenities = @amenities WHERE id = @id',
  );
  for (const field of SEED_FIELDS) {
    update.run({ id: field.id, sizeFormat: field.sizeFormat, description: field.description, amenities: JSON.stringify(field.amenities) });
  }
}
ensureFieldDetailsBackfilled();

export function getAvailableFields(): Field[] {
  const rows = db.prepare('SELECT * FROM fields WHERE available = 1').all() as FieldRow[];
  return rows.map(rowToField);
}
