// Loads .colaberry/*.json at runtime and joins plan + progress by story id.
// Nothing here is hard-coded project content — every field is read from the files.

const DATA_PATHS = {
  plan: '.colaberry/plan.json',
  progress: '.colaberry/progress.json',
  manifest: '.colaberry/manifest.json',
  profile: '.colaberry/profile.json',
};

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export async function loadRealData() {
  const [plan, progress, manifest, profile] = await Promise.all([
    fetchJson(DATA_PATHS.plan).catch(() => null),
    fetchJson(DATA_PATHS.progress).catch(() => null),
    fetchJson(DATA_PATHS.manifest).catch(() => null),
    fetchJson(DATA_PATHS.profile).catch(() => null),
  ]);
  return build(plan, progress, manifest, profile, false);
}

export function buildFromSample(sample) {
  return build(sample.plan, sample.progress, sample.manifest, sample.profile, true);
}

function build(plan, progress, manifest, profile, isSample) {
  const progressById = new Map();
  (progress?.stories || []).forEach((s) => progressById.set(s.id, s));

  const stories = (plan?.stories || []).map((s) => {
    const p = progressById.get(s.id);
    return {
      ...s,
      // plan.json schema_version 2 renamed this field; normalize once here
      // rather than in every tab that reads it.
      owner: s.owner ?? s.owner_agent ?? null,
      verification: p?.verification || { state: 'not_started', commit: null },
      points: p?.points ?? 0,
      progressCriteria: p?.criteria || [],
    };
  });

  const storiesById = new Map(stories.map((s) => [s.id, s]));

  const requirements = (plan?.requirements || []).map((r) => ({
    ...r,
    fulfilled_by: r.fulfilled_by || [],
  }));

  return {
    isSample,
    plan: plan || null,
    progress: progress || null,
    manifest: manifest || null,
    profile: profile || null,
    stories,
    storiesById,
    requirements,
    loadError: !plan || !progress || !manifest,
  };
}

// Date-only strings ("YYYY-MM-DD") must never round-trip through UTC parsing —
// `new Date("2026-08-15")` is UTC midnight, which renders as the 14th in any
// timezone behind UTC. Build the Date from local components instead.
export function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function formatAbsoluteDate(iso) {
  if (!iso) return 'unknown date';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'unknown date';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatRelativeAge(iso, now = new Date()) {
  if (!iso) return 'unknown age';
  const then = new Date(iso);
  if (isNaN(then.getTime())) return 'unknown age';
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'moments ago';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

export function isStale(iso, now = new Date()) {
  if (!iso) return true;
  const then = new Date(iso);
  if (isNaN(then.getTime())) return true;
  const diffDays = (now.getTime() - then.getTime()) / 86400000;
  return diffDays > 7;
}
