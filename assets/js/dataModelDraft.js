// DRAFT data model — derived from the requirements in plan.json, not yet
// implemented as real database tables. This is a proposal for review, not a
// result the project has produced. See the Data model tab for the caveat
// shown alongside it.

export const ENTITIES = [
  {
    name: 'Customer',
    supports: ['REQ-017'],
    fields: [
      ['id', 'uuid, primary key'],
      ['name', 'text'],
      ['email', 'text, unique'],
      ['phone', 'text, nullable'],
      ['created_at', 'timestamp'],
    ],
  },
  {
    name: 'Field',
    supports: ['REQ-001', 'REQ-009'],
    fields: [
      ['id', 'uuid, primary key'],
      ['name', 'text'],
      ['location', 'text'],
      ['surface_type', 'text'],
      ['price_per_hour', 'decimal'],
      ['active', 'boolean'],
    ],
  },
  {
    name: 'Booking',
    supports: ['REQ-002', 'REQ-003', 'REQ-016'],
    fields: [
      ['id', 'uuid, primary key'],
      ['field_id', 'uuid, FK → Field'],
      ['customer_id', 'uuid, FK → Customer'],
      ['start_time', 'timestamp'],
      ['end_time', 'timestamp'],
      ['status', "enum: confirmed | cancelled"],
      ['created_at', 'timestamp'],
    ],
  },
  {
    name: 'BookingConflict',
    supports: ['REQ-010'],
    fields: [
      ['id', 'uuid, primary key'],
      ['booking_id', 'uuid, FK → Booking'],
      ['conflicting_booking_id', 'uuid, FK → Booking'],
      ['detected_at', 'timestamp'],
      ['resolution', 'text, nullable'],
    ],
  },
  {
    name: 'SchedulingIssue',
    supports: ['REQ-011', 'REQ-013'],
    fields: [
      ['id', 'uuid, primary key'],
      ['type', 'enum: conflict | cancellation | gap'],
      ['booking_id', 'uuid, FK → Booking, nullable'],
      ['detected_at', 'timestamp'],
      ['notified_at', 'timestamp, nullable'],
    ],
  },
  {
    name: 'RefundComplaintRequest',
    supports: ['REQ-008', 'REQ-015'],
    fields: [
      ['id', 'uuid, primary key'],
      ['booking_id', 'uuid, FK → Booking'],
      ['customer_id', 'uuid, FK → Customer'],
      ['type', 'enum: refund | complaint'],
      ['status', 'enum: pending | approved | denied'],
      ['submitted_at', 'timestamp'],
      ['decided_at', 'timestamp, nullable'],
      ['decided_by', 'uuid, FK → StaffUser, nullable'],
    ],
  },
  {
    name: 'AuditTrailEntry',
    supports: ['STORY-011'],
    fields: [
      ['id', 'uuid, primary key'],
      ['entity_type', 'text — e.g. "Booking"'],
      ['entity_id', 'uuid'],
      ['action', 'text'],
      ['actor', 'text'],
      ['occurred_at', 'timestamp'],
    ],
  },
  {
    name: 'AIConversation',
    supports: ['REQ-004', 'REQ-012'],
    fields: [
      ['id', 'uuid, primary key'],
      ['customer_id', 'uuid, FK → Customer, nullable'],
      ['channel', 'text'],
      ['started_at', 'timestamp'],
    ],
  },
  {
    name: 'AIMessage',
    supports: ['REQ-005'],
    fields: [
      ['id', 'uuid, primary key'],
      ['conversation_id', 'uuid, FK → AIConversation'],
      ['sender', 'enum: customer | ai | human'],
      ['body', 'text'],
      ['escalated', 'boolean'],
      ['created_at', 'timestamp'],
    ],
  },
  {
    name: 'BusinessAnalyticsSnapshot',
    supports: ['REQ-007', 'REQ-014'],
    fields: [
      ['id', 'uuid, primary key'],
      ['period_start', 'date'],
      ['period_end', 'date'],
      ['bookings_count', 'integer'],
      ['busy_periods', 'jsonb'],
      ['slow_periods', 'jsonb'],
      ['generated_at', 'timestamp'],
    ],
  },
  {
    name: 'StaffUser',
    supports: ['internal roles'],
    fields: [
      ['id', 'uuid, primary key'],
      ['name', 'text'],
      ['email', 'text, unique'],
      ['role', 'enum: business_owner | system_administrator | system_auditor | scheduler'],
      ['created_at', 'timestamp'],
    ],
  },
];

export const RELATIONSHIPS = [
  'Customer 1—* Booking',
  'Field 1—* Booking',
  'Booking 1—* BookingConflict (via booking_id and conflicting_booking_id, self-referential)',
  'Booking 1—* SchedulingIssue',
  'Booking 1—* RefundComplaintRequest, Customer 1—* RefundComplaintRequest',
  'StaffUser 1—* RefundComplaintRequest (decided_by)',
  'Customer 1—* AIConversation, AIConversation 1—* AIMessage',
  'AuditTrailEntry references other entities polymorphically via (entity_type, entity_id)',
  'BusinessAnalyticsSnapshot is a standalone aggregate, not tied to a single Booking',
];
