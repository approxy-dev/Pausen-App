import { getFeedbackConfig } from './feedback-config.mjs';
import { createFeedbackHandler } from './feedback-handler.mjs';

export function createFeedbackStore(config, send = fetch) {
  return {
    async save({ name, email, message, clientKey }) {
      const response = await send(config.submissionUrl, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { apikey: config.publishableKey, 'x-pausen-submission-key': config.submissionKey,
          'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ p_name: name, p_email: email, p_message: message, p_client_key: clientKey })
      });
      if (!response.ok) throw new Error('Feedback storage unavailable');
      const accepted = await response.json();
      if (typeof accepted !== 'boolean') throw new Error('Unexpected feedback result');
      return accepted;
    }
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
