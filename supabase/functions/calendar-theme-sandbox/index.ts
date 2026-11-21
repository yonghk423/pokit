import { createDownloadHandler } from '../calendar-theme/handler.ts';
import { checkSandboxPurchaseAccess } from '../_shared/applePurchaseAccess.ts';
Deno.serve(createDownloadHandler(checkSandboxPurchaseAccess));
