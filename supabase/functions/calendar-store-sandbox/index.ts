import { createDownloadHandler } from '../calendar-store/handler.ts';
import { checkSandboxPurchaseAccess } from '../_shared/applePurchaseAccess.ts';
Deno.serve(createDownloadHandler(checkSandboxPurchaseAccess));
