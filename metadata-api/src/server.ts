import { createMetadataServer } from './index.js';

const port = Number.parseInt(process.env.PORT ?? '8088', 10);
const host = process.env.HOST ?? '127.0.0.1';

createMetadataServer().listen(port, host, () => {
  console.log(`private-signal metadata API listening on http://${host}:${port}`);
});
