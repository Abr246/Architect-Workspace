import { useEffect, useState } from 'react';
import { Field } from '../services/fieldsApi';
import { fetchAllBookings, Booking } from '../services/bookingsApi';
import { OPERATING_HOURS, todayLocalDateString, formatHourLabel, slotStatus } from '../utils/timeSlots';

interface Props {
  field: Field;
  onBack: () => void;
  onBook: (initialDate: string) => void;
}

const AMENITY_ICONS: Record<string, string> = {
  Parking: '🅿️',
  'Locker rooms': '🚪',
  Restrooms: '🚻',
  Lighting: '💡',
  Seating: '🪑',
};

function amenityIcon(name: string): string {
  return AMENITY_ICONS[name] ?? '✓';
}

export function FieldDetailsPage({ field, onBack, onBook }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayLocalDateString());
  const [fieldBookings, setFieldBookings] = useState<Booking[]>([]);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllBookings()
      .then((all) => {
        if (cancelled) return;
        setFieldBookings(all.filter((b) => b.fieldId === field.id));
      })
      .catch(() => {
        if (cancelled) return;
        setPreviewFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [field.id]);

  return (
    <div className="gk-page">
      <button type="button" className="gk-back-link" onClick={onBack}>
        ← Back to all fields
      </button>

      <div className="gk-details">
        <div className="gk-details__image" aria-hidden="true">
          <span className="gk-details__image-icon">⚽</span>
        </div>

        <div className="gk-details__header">
          <div>
            <h1 className="gk-details__name">{field.name}</h1>
            <p className="gk-details__location">📍 {field.location}</p>
          </div>
          <span className="gk-badge gk-badge--available">
            <span className="gk-badge__dot" aria-hidden="true" />
            Available
          </span>
        </div>

        <div className="gk-details__facts">
          <div className="gk-field-card__meta-item">
            <span className="gk-field-card__meta-label">Price</span>
            <span className="gk-field-card__price">${field.pricePerHour}/hr</span>
          </div>
          <div className="gk-field-card__meta-item">
            <span className="gk-field-card__meta-label">Surface</span>
            <span className="gk-field-card__meta-value">{field.surfaceType}</span>
          </div>
          <div className="gk-field-card__meta-item">
            <span className="gk-field-card__meta-label">Field size</span>
            <span className="gk-field-card__meta-value">{field.sizeFormat}</span>
          </div>
        </div>

        <p className="gk-details__description">{field.description}</p>

        <h2>Amenities</h2>
        <ul className="gk-amenities">
          {field.amenities.map((amenity) => (
            <li key={amenity} className="gk-amenities__item">
              <span aria-hidden="true">{amenityIcon(amenity)}</span>
              {amenity}
            </li>
          ))}
        </ul>

        <h2>Availability</h2>
        <label className="gk-field">
          Date
          <input
            type="date"
            value={selectedDate}
            min={todayLocalDateString()}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
        <div className="gk-slot-grid">
          {OPERATING_HOURS.map((hour) => {
            const status = previewFailed ? 'available' : slotStatus(selectedDate, hour, fieldBookings);
            return (
              <button
                key={hour}
                type="button"
                disabled={status !== 'available'}
                className={`gk-slot gk-slot--${status}`}
                onClick={() => onBook(selectedDate)}
              >
                <span className="gk-slot__time">{formatHourLabel(hour)}</span>
                <span className="gk-slot__status">
                  {status === 'available' ? 'Available' : status === 'booked' ? 'Booked' : 'Past'}
                </span>
              </button>
            );
          })}
        </div>
        {previewFailed && (
          <p className="gk-slot-picker__note">
            Couldn't check which times are already booked — you can still book and we'll confirm it then.
          </p>
        )}

        <button
          type="button"
          className="gk-button gk-button--primary gk-button--block gk-details__book-button"
          onClick={() => onBook(selectedDate)}
        >
          Book This Field
        </button>
      </div>
    </div>
  );
}
