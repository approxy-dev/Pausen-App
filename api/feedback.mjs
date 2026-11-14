import { configuredFeedbackHandler } from '../server/feedback-store.mjs';

let handler;
export default {
  async fetch(request) {
    handler ??= configuredFeedbackHandler();
    return handler(request);
  }
};
