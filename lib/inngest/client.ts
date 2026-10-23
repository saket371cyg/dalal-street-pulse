import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'dalal-street-pulse',
  name: 'Dalal Street Pulse Background Workflows',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
