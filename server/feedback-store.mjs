import postgres from 'postgres';
import { getFeedbackConfig } from './feedback-config.mjs';
import { createFeedbackHandler } from './feedback-handler.mjs';

export function createFeedbackStore(config) {
  const sql = postgres(config.databaseUrl, {
    max: 1, max_pipeline: 1, prepare: false,
    connect_timeout: 5, query_timeout: 8, idle_timeout: 20,
    ssl: { rejectUnauthorized: true, ...(config.databaseCa ? { ca: config.databaseCa } : {}) },
    onnotice: () => {},
    connection: { application_name: 'pausen-feedback' }
  });
  return {
    async save({ name, email, message, clientKey }) {
      const [result] = await sql`
        select pausen_private.submit_feedback(${name}, ${email}, ${message}, ${clientKey}) as accepted
      `;
      return result?.accepted === true;
    },
    close: () => sql.end({ timeout: 5 })
  };
}

export function configuredFeedbackHandler(localOrigin) {
  try {
    const config = getFeedbackConfig();
    if (localOrigin && config.enabled) config.origin = localOrigin;
    const store = config.enabled ? createFeedbackStore(config) : null;
    return createFeedbackHandler({ config, save: values => store.save(values) });
  } catch {
    return createFeedbackHandler({ config: { enabled: false } });
  }
}
