import { useEffect, useState } from 'react';
import { fetchAvailableFields, Field } from '../services/fieldsApi';

type LoadState = 'loading' | 'error' | 'ready';

export function FieldsAvailabilityPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    fetchAvailableFields()
      .then((data) => {
        if (cancelled) return;
        setFields(data);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <p>Loading available fields…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load fields right now. Please try again shortly.</p>;
  }

  if (fields.length === 0) {
    return <p>No fields are available right now.</p>;
  }

  return (
    <div>
      <h1>Available soccer fields</h1>
      <ul>
        {fields.map((field) => (
          <li key={field.id}>
            <strong>{field.name}</strong> — {field.location} ({field.surfaceType}) — ${field.pricePerHour}/hr
          </li>
        ))}
      </ul>
    </div>
  );
}
