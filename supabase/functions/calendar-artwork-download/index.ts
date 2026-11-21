import { createDownloadHandler } from './handler.ts';
Deno.serve(createDownloadHandler());
