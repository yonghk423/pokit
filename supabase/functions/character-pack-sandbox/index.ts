import { createDownloadHandler } from '../character-pack/handler.ts';
import { sandboxAccessForRequest } from '../_shared/simulatorRevenueCatAccess.ts';
Deno.serve(request => createDownloadHandler(sandboxAccessForRequest(request))(request));
