import { createDownloadHandler } from '../calendar-store/handler.ts';
import { sandboxAccessForRequest } from '../_shared/simulatorRevenueCatAccess.ts';
Deno.serve(request => createDownloadHandler(sandboxAccessForRequest(request))(request));
