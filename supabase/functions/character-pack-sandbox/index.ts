import { createDownloadHandler } from '../character-pack/handler.ts';
import { checkSandboxPurchaseAccess } from '../_shared/applePurchaseAccess.ts';
Deno.serve(createDownloadHandler(checkSandboxPurchaseAccess));
