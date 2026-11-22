// Store-wide download entry point. Keep calendar-store for already released apps.
import { createDownloadHandler } from '../calendar-store/handler.ts';
Deno.serve(createDownloadHandler());
