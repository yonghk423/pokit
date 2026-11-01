const updates: any[] = [];
const tasks: Promise<unknown>[] = [];
const storage = {
 upload: jest.fn(async () => ({ error: null })),
 remove: jest.fn(async () => ({ error: null })),
 createSignedUrl: jest.fn(async () => ({ data: { signedUrl: 'https://example.test/private-result' } })),
};
let rows: any[] = [{ index: 0, state: 'processing' }];
const mockAdmin = {
 auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'test-user' } } })) },
 rpc: jest.fn(async (name: string) => ({ data: name.endsWith('claim') ? true : 2 })),
 storage: { from: jest.fn(() => storage) },
 from: jest.fn(() => {
  const query: Record<string, any> = {};
  for (const name of ['select', 'eq', 'lt', 'order', 'delete', 'is', 'not', 'or', 'limit']) query[name] = jest.fn(() => query);
  query.update = jest.fn((value: unknown) => { updates.push(value); return query; });
  query.maybeSingle = async () => ({ data: { mode: 'photo', count: 1 } });
  query.single = async () => ({ data: { state: 'processing' } });
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: rows }));
  return query;
 }),
};
jest.mock('npm:@supabase/supabase-js@2.116.0', () => ({ createClient: () => mockAdmin }), { virtual: true });
let handler: (req: Request) => Promise<Response>;
const previousDeno = (globalThis as any).Deno;
const previousEdgeRuntime = (globalThis as any).EdgeRuntime;
const previousFetch = global.fetch;
beforeAll(() => {
 (globalThis as any).Deno = { env: { get: () => 'test' }, serve: (value: typeof handler) => { handler = value; } };
 (globalThis as any).EdgeRuntime = { waitUntil: (task: Promise<unknown>) => tasks.push(task) };
 require('./index');
});
beforeEach(() => { jest.clearAllMocks(); updates.length=0;tasks.length=0;rows=[{index:0,state:'processing'}]; });
afterAll(() => { (globalThis as any).Deno=previousDeno;(globalThis as any).EdgeRuntime=previousEdgeRuntime;global.fetch=previousFetch; });
function renderRequest(id='test-job-123') { return new Request(`https://example.test/functions/v1/yourday-ai/jobs/${id}/render/0`, {method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({base:'/9j/AAAA'})}); }
it('accepts immediately and finishes independently in a background task with a private stored result', async () => {
 let finish!: (value: unknown) => void;
 global.fetch=jest.fn(()=>new Promise(resolve=>{finish=resolve;})) as never;
 const response=await handler(renderRequest());
 expect(response.status).toBe(202);
 expect(await response.json()).toMatchObject({status:'processing'});
 expect(tasks).toHaveLength(1);
 await new Promise(resolve=>setTimeout(resolve,0));
 expect(storage.upload).not.toHaveBeenCalled();
 finish({ok:true,json:async()=>({data:[{b64_json:'iVBORw0KGgoAAAAA'}]})});
 await Promise.all(tasks);
 expect(mockAdmin.storage.from).toHaveBeenCalledWith('yourday-ai-results');
 expect(storage.upload).toHaveBeenCalledWith('test-user/test-job-123/0.png',expect.any(Uint8Array),expect.objectContaining({contentType:'image/png'}));
 expect(updates).toContainEqual(expect.objectContaining({state:'completed',object_path:'test-user/test-job-123/0.png'}));
 expect(JSON.stringify(updates)).not.toContain('iVBORw0KGgo');
});
it('marks upstream failures as refunded even after the caller has disconnected', async () => {
 global.fetch=jest.fn(async()=>({ok:false,status:500})) as never;
 expect((await handler(renderRequest('test-job-456'))).status).toBe(202);
 await Promise.all(tasks);
 expect(updates).toContainEqual({state:'failed',error:'generation_failed'});
});
it('returns recoverable signed URLs instead of image bytes or public object URLs', async () => {
 rows=[{index:0,state:'completed',object_path:'test-user/test-job-123/0.png'}];
 const response=await handler(new Request('https://example.test/functions/v1/yourday-ai/jobs/test-job-123',{headers:{Authorization:'Bearer test'}}));
 expect(await response.json()).toMatchObject({status:'completed',results:[{index:0,url:'https://example.test/private-result'}]});
 expect(storage.createSignedUrl).toHaveBeenCalledWith('test-user/test-job-123/0.png',600);
});
it('deletes the temporary server copy only after the saved receipt succeeds', async () => {
 rows=[{index:0,state:'completed',object_path:'test-user/test-job-123/0.png',delivered_at:'2026-11-01T00:00:00Z'}];
 await handler(new Request('https://example.test/functions/v1/yourday-ai/jobs/test-job-123/saved',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({indices:[0]})}));
 expect(mockAdmin.rpc).toHaveBeenCalledWith('yourday_ai_confirm_saved',expect.any(Object));
 expect(storage.remove).toHaveBeenCalledWith(['test-user/test-job-123/0.png']);
 expect(updates).toContainEqual({object_path:null});
});
