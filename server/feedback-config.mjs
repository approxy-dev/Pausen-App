export const feedbackProjectRef = 'toufdniikzwrycrpfuoo';
const submissionUrl = `https://${feedbackProjectRef}.supabase.co/rest/v1/rpc/pausen_submit_feedback`;

export function getFeedbackConfig(env = process.env) {
  const enabled = env.FEEDBACK_ENABLED === 'true' && env.VERCEL_ENV !== 'preview';
  if (!enabled) return { enabled: false };
  const origin = new URL(env.SITE_URL || 'https://pausenapk.vercel.app');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('SITE_URL must be an HTTPS origin.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(env.FEEDBACK_PUBLISHABLE_KEY || '')) {
    throw new Error('FEEDBACK_PUBLISHABLE_KEY must be the Pausen Supabase publishable API key.');
  }
  if (!/^[a-f0-9]{64}$/.test(env.FEEDBACK_SUBMISSION_KEY || '')) {
    throw new Error('FEEDBACK_SUBMISSION_KEY must contain 32 random bytes encoded as lowercase hex.');
  }
  if (!/^[a-f0-9]{64}$/i.test(env.FEEDBACK_RATE_LIMIT_SECRET || '')) {
    throw new Error('FEEDBACK_RATE_LIMIT_SECRET must contain 32 random bytes encoded as hex.');
  }
  if (env.FEEDBACK_SUBMISSION_KEY === env.FEEDBACK_RATE_LIMIT_SECRET.toLowerCase()) {
    throw new Error('Generate distinct secrets for submission and rate limiting.');
  }
  return { enabled, origin: origin.origin, submissionUrl, publishableKey: env.FEEDBACK_PUBLISHABLE_KEY,
    submissionKey: env.FEEDBACK_SUBMISSION_KEY, rateLimitSecret: env.FEEDBACK_RATE_LIMIT_SECRET };
}
