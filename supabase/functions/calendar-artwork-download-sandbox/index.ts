import { createDownloadHandler } from '../calendar-artwork-download/handler.ts';
import { sandboxAccessForRequest } from '../_shared/simulatorRevenueCatAccess.ts';
Deno.serve(request => createDownloadHandler(sandboxAccessForRequest(request))(request));
