import { useEffect, useState } from 'react';
import { fetchAvailableFields, Field } from '../services/fieldsApi';
import { BookingForm } from '../components/BookingForm';
import { FieldDetailsPage } from './FieldDetailsPage';

type LoadState = 'loading' | 'error' | 'ready';

export function FieldsAvailabilityPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [bookingFieldId, setBookingFieldId] = useState<string | null>(null);
  const [bookingInitialDate, setBookingInitialDate] = useState<string | undefined>(undefined);
  const [detailsFieldId, setDetailsFieldId] = useState<string | null>(null);

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
    return <p className="gk-status">Loading available fields…</p>;
  }

  if (state === 'error') {
    return <p role="alert">Couldn't load fields right now. Please try again shortly.</p>;
  }

  const bookingField = fields.find((field) => field.id === bookingFieldId) ?? null;
  const detailsField = fields.find((field) => field.id === detailsFieldId) ?? null;

  function openBooking(fieldId: string, initialDate?: string) {
    setBookingFieldId(fieldId);
    setBookingInitialDate(initialDate);
  }

  if (detailsField) {
    return (
      <>
        <FieldDetailsPage
          field={detailsField}
          onBack={() => setDetailsFieldId(null)}
          onBook={(initialDate) => openBooking(detailsField.id, initialDate)}
        />
        {bookingField && (
          <BookingForm
            fieldId={bookingField.id}
            fieldName={bookingField.name}
            fieldLocation={bookingField.location}
            fieldSurfaceType={bookingField.surfaceType}
            fieldPricePerHour={bookingField.pricePerHour}
            initialDate={bookingInitialDate}
            onClose={() => setBookingFieldId(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="gk-page">
      <h1>Available soccer fields</h1>
      <p className="gk-page__intro">Choose a field below and book your next match in minutes.</p>
      {fields.length === 0 ? (
        <div className="gk-empty-state">
          <span className="gk-empty-state__icon" aria-hidden="true">🏟️</span>
          <h3>No fields available right now</h3>
          <p>Check back shortly, or contact the facility for more information.</p>
        </div>
      ) : (
        <ul className="gk-fields-grid">
          {fields.map((field) => (
            <li key={field.id} className="gk-field-card">
              <button
                type="button"
                className="gk-field-card__image gk-field-card__image--link"
                onClick={() => setDetailsFieldId(field.id)}
                aria-label={`View details for ${field.name}`}
              >
                <span className="gk-field-card__image-icon" aria-hidden="true">⚽</span>
              </button>
              <div className="gk-field-card__body">
                <div className="gk-field-card__header">
                  <h3 className="gk-field-card__name">
                    <button type="button" className="gk-field-card__name-link" onClick={() => setDetailsFieldId(field.id)}>
                      {field.name}
                    </button>
                  </h3>
                  <span className="gk-badge gk-badge--available">
                    <span className="gk-badge__dot" aria-hidden="true" />
                    Available
                  </span>
                </div>
                <p className="gk-field-card__location">📍 {field.location}</p>
                <div className="gk-field-card__meta">
                  <div className="gk-field-card__meta-item">
                    <span className="gk-field-card__meta-label">Surface</span>
                    <span className="gk-field-card__meta-value">{field.surfaceType}</span>
                  </div>
                  <div className="gk-field-card__meta-item">
                    <span className="gk-field-card__meta-label">Price</span>
                    <span className="gk-field-card__price">${field.pricePerHour}/hr</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="gk-button gk-button--primary gk-button--block"
                  onClick={() => openBooking(field.id)}
                >
                  Book Now
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {bookingField && (
        <BookingForm
          fieldId={bookingField.id}
          fieldName={bookingField.name}
          fieldLocation={bookingField.location}
          fieldSurfaceType={bookingField.surfaceType}
          fieldPricePerHour={bookingField.pricePerHour}
          initialDate={bookingInitialDate}
          onClose={() => setBookingFieldId(null)}
        />
      )}
    </div>
  );
}
