import { createDownloadHandler } from '../calendar-artwork-download/handler.ts';
import { checkSandboxPurchaseAccess } from '../_shared/applePurchaseAccess.ts';
Deno.serve(createDownloadHandler(checkSandboxPurchaseAccess));
