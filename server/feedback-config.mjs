export const feedbackProjectRef = 'toufdniikzwrycrpfuoo';

export function getFeedbackConfig(env = process.env) {
  const enabled = env.FEEDBACK_ENABLED === 'true' && env.VERCEL_ENV !== 'preview';
  if (!enabled) return { enabled: false };
  const origin = new URL(env.SITE_URL || 'https://pausenapk.vercel.app');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('SITE_URL must be an HTTPS origin.');
  }
  const databaseUrl = new URL(env.FEEDBACK_DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)
      || !/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(databaseUrl.hostname)
      || databaseUrl.port !== '6543' || databaseUrl.pathname !== '/postgres'
      || decodeURIComponent(databaseUrl.username) !== `pausen_feedback_writer.${feedbackProjectRef}`
      || !databaseUrl.password || databaseUrl.search || databaseUrl.hash) {
    throw new Error('Use the Pausen feedback writer transaction-pooler connection, without query parameters.');
  }
  if (!/^[a-f0-9]{64}$/i.test(env.FEEDBACK_RATE_LIMIT_SECRET || '')) {
    throw new Error('FEEDBACK_RATE_LIMIT_SECRET must contain 32 random bytes encoded as hex.');
  }
  return {
    enabled, origin: origin.origin, databaseUrl: databaseUrl.href,
    rateLimitSecret: env.FEEDBACK_RATE_LIMIT_SECRET,
    databaseCa: env.FEEDBACK_DATABASE_CA || undefined
  };
}
