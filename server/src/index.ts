import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);
// Bind to loopback only: this is a single-user local app.
createApp().listen(port, '127.0.0.1', () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});
