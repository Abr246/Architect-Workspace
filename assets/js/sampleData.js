// SAMPLE DATA — entirely fabricated, for showing the shape of a finished
// Command Center. Never used unless the viewer explicitly switches to
// Sample mode, and every tab that reads it must label it visibly.
// Reuses the REAL plan's requirements/stories/releases (those are true,
// committed project facts) and overlays fabricated progress + derived
// content for the things the real project hasn't produced yet.

const SAMPLE_VERIFICATION = {
  'STORY-000': { state: 'in_progress', commit: null, points: 0 },
  'STORY-001': { state: 'verified', commit: 'a1c9e02', points: 8 },
  'STORY-002': { state: 'verified', commit: 'b47f3d1', points: 8 },
  'STORY-004': { state: 'in_progress', commit: null, points: 0 },
  'STORY-011': { state: 'submitted', commit: 'c88e410', points: 0 },
  'STORY-005': { state: 'not_started', commit: null, points: 0 },
  'STORY-006': { state: 'not_started', commit: null, points: 0 },
  'STORY-012': { state: 'not_started', commit: null, points: 0 },
  'STORY-003': { state: 'not_started', commit: null, points: 0 },
  'STORY-007': { state: 'not_started', commit: null, points: 0 },
  'STORY-008': { state: 'not_started', commit: null, points: 0 },
  'STORY-009': { state: 'not_started', commit: null, points: 0 },
  'STORY-010': { state: 'not_started', commit: null, points: 0 },
};

const SAMPLE_MEASURES = [
  { id: 'M-1', statement: 'Reduce double-booked field slots to zero within 30 days of launch.' },
  { id: 'M-2', statement: 'Cut average time-to-complete-a-booking to under 90 seconds.' },
  { id: 'M-3', statement: 'Resolve at least 70% of customer questions via AI without human escalation.' },
];

const SAMPLE_GUARDRAILS = [
  { id: 'G-1', statement: 'Never confirm a booking without checking for scheduling conflicts first.', requirement_id: 'REQ-010' },
  { id: 'G-2', statement: 'Never process a refund or complaint outcome without human approval.', requirement_id: 'REQ-008' },
];

const SAMPLE_SYSTEMS = [
  { name: 'Booking Database', status: 'good', last_checked: '2026-08-17T04:10:00Z' },
  { name: 'Customer Information Database', status: 'good', last_checked: '2026-08-17T04:10:00Z' },
  { name: 'Payment Processor', status: 'critical', last_checked: '2026-08-17T02:40:00Z' },
  { name: 'SMS / Email Notification Service', status: 'unknown', last_checked: null },
];

const SAMPLE_AGENT_RUNS = {
  'AI System': { runs_7d: 214, success_rate: 0.97, last_run: '2026-08-17T05:55:00Z' },
  'AI Team': { runs_7d: 58, success_rate: 0.91, last_run: '2026-08-17T05:40:00Z' },
  'Analytics Team': { runs_7d: 7, success_rate: 1.0, last_run: '2026-08-16T23:00:00Z' },
  'Conflict Detection Team': { runs_7d: 132, success_rate: 0.99, last_run: '2026-08-17T06:02:00Z' },
};

const SAMPLE_AGENT_SKILLS = {
  'AI System': ['pricing-lookup', 'availability-lookup', 'faq-answering'],
  'AI Team': ['scheduling-optimizer', 'complex-query-triage'],
  'Analytics Team': ['trend-summary', 'busy-period-detection'],
  'Conflict Detection Team': ['overlap-detection'],
};

export function buildSampleBundle(realPlan) {
  const plan = realPlan ? JSON.parse(JSON.stringify(realPlan)) : { requirements: [], stories: [], releases: [], schedule: {}, project: {} };
  plan.derived = plan.derived || {};
  plan.derived.measures = SAMPLE_MEASURES;
  plan.derived.guardrails = SAMPLE_GUARDRAILS;
  plan.derived.systems = SAMPLE_SYSTEMS.map((s) => s.name);
  plan.derived.sampleSystemStatus = SAMPLE_SYSTEMS;
  plan.derived.sampleAgentRuns = SAMPLE_AGENT_RUNS;
  plan.derived.sampleAgentSkills = SAMPLE_AGENT_SKILLS;

  const progressStories = (plan.stories || []).concat([{ id: 'STORY-000' }]).map((s) => {
    const v = SAMPLE_VERIFICATION[s.id] || { state: 'not_started', commit: null, points: 0 };
    const criteriaSource = s.id === 'STORY-000'
      ? [
        'Given the Command Center, when it is opened, then every tab is reachable and every card drills down one level.',
        'Given sample mode, when any tab is shown, then the sample data is visibly labelled as sample.',
        'Given the data files, when any tab renders, then its content comes from .colaberry/plan.json and .colaberry/progress.json read at runtime rather than from hard-coded values.',
        'Given .colaberry/manifest.json, when any tab is shown, then it displays how old the data is and warns when that age exceeds a week.',
        'Trust — no tab shows a number, a connection or a result the project has not actually produced.',
      ]
      : (s.acceptance_criteria || []);
    const allPass = v.state === 'verified';
    return {
      id: s.id,
      verification: { state: v.state, commit: v.commit },
      points: v.points,
      criteria: criteriaSource.map((text) => ({ text, passed: allPass })),
    };
  });

  const criteriaTotal = progressStories.reduce((sum, s) => sum + s.criteria.length, 0);
  const criteriaPassed = progressStories.reduce((sum, s) => sum + s.criteria.filter((c) => c.passed).length, 0);
  const pointsAwarded = progressStories.reduce((sum, s) => sum + (s.points || 0), 0);
  const storiesVerified = progressStories.filter((s) => s.verification.state === 'verified').length;

  const progress = {
    schema_version: 1,
    totals: {
      stories_total: progressStories.length,
      stories_verified: storiesVerified,
      criteria_total: criteriaTotal,
      criteria_passed: criteriaPassed,
      points_awarded: pointsAwarded,
    },
    stories: progressStories,
  };

  const manifest = { schema_version: 1, generated_at: '2026-08-17T05:58:00Z' };
  const profile = { schema_version: 1, portfolio: { headline: 'GoalKick — AI-powered field booking', summary: 'Sample portfolio text.' }, publish: { allow_public_share: false } };

  return { plan, progress, manifest, profile };
}
