import { getAvailableFields } from './fieldsService';

describe('getAvailableFields', () => {
  it('returns only fields marked available', () => {
    const fields = getAvailableFields();

    expect(fields.length).toBeGreaterThan(0);
    expect(fields.every((field) => field.available)).toBe(true);
  });

  it('excludes a field that is booked (available: false)', () => {
    const fields = getAvailableFields();

    // field-3 is seeded as unavailable — the acceptance criterion this
    // covers: "Given a field is booked... then the field is not shown."
    expect(fields.find((field) => field.id === 'field-3')).toBeUndefined();
  });
});
