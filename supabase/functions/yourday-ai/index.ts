import { planDiaryScene } from './scenePlan.ts';
import { faceRejections, validateFace } from './faceValidation.ts';
import { generationRequest, validateStory, type HeroStory } from './generationRequest.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const resultBucket = 'yourday-ai-results';
declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void };
const limitBytes = 18000000;
const activeRenders = new Map<string, AbortController>();
async function body(req: Request) {
  if (Number(req.headers.get('content-length') ?? 0) > limitBytes) throw new Error('too_large');
  const reader=req.body?.getReader(); if(!reader) throw new Error('invalid_request');
  let size=0; const chunks: Uint8Array[]=[];
  while(true){ const next=await reader.read(); if(next.done) break; size+=next.value.length; if(size>limitBytes){await reader.cancel();throw new Error('too_large');} chunks.push(next.value); }
  const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
function jpeg(value: unknown) {
  if(typeof value!=='string'||value.length>8500000||!value.startsWith('/9j/')||!/^[A-Za-z0-9+/=]+$/.test(value))throw new Error('invalid_image');
  return new Blob([Uint8Array.from(atob(value),c=>c.charCodeAt(0))],{type:'image/jpeg'});
}
const remaining = async (user: string) => { const { data,error }=await admin.rpc('yourday_ai_remaining',{p_user:user});if(error)throw new Error('database_error');return data as number; };
async function owned(user: string,id: string) {
  const {data,error}=await admin.from('yourday_ai_jobs').select('*').eq('id',id).eq('user_id',user).maybeSingle();
  if(error||!data)throw new Error('not_found');return data;
}
async function job(user: string,id: string) {
  await owned(user,id);
  // Reclaim interrupted/unacknowledged work before returning its status.
  await remaining(user);
  const {data,error}=await admin.from('yourday_ai_outputs').select('*').eq('job_id',id).order('index');if(error)throw new Error('database_error');
  const outputs=data??[];
  const processing=outputs.some(o=>o.state==='reserved'||o.state==='processing');
  return { id,status:processing?'processing':outputs.every(o=>o.state==='completed')?'completed':'failed',
    results:await Promise.all(outputs.filter(o=>o.state==='completed').map(async o=>{
      if(!o.object_path)return {index:o.index};
      const signed=await admin.storage.from(resultBucket).createSignedUrl(o.object_path,600);
      if(signed.error)throw new Error('save_failed');
      return {index:o.index,url:signed.data.signedUrl};
    })),
    remaining:await remaining(user),error:outputs.find(o=>o.error)?.error,
    pending:outputs.filter(o=>o.state==='reserved').map(o=>o.index) };
}
async function render(user: string,id: string,index: number,mode: string,base: Blob,reference?: Blob,story?: HeroStory) {
  let resultReceived=false;
  const renderKey=`${id}:${index}`, controller=new AbortController();
  activeRenders.set(renderKey,controller);
  const timeout=setTimeout(()=>controller.abort(),115000);
  try{
    const current=await admin.from('yourday_ai_outputs').select('state').eq('job_id',id).eq('index',index).single();
    if(current.error)throw new Error('database_error');
    if(current.data.state!=='processing')return json({error:'cancelled'},409);
    const scenePlan=story?.source==='character' ? await planDiaryScene(story,Deno.env.get('OPENAI_API_KEY'),controller.signal) : undefined;
    controller.signal.throwIfAborted();
    // Cancellation may reach another worker while the scene planner is running.
    const ready=await admin.from('yourday_ai_outputs').select('state').eq('job_id',id).eq('index',index).single();
    if(ready.error)throw new Error('database_error');
    if(ready.data.state!=='processing')return json({error:'cancelled'},409);
    const form=generationRequest(mode,base,reference,story,scenePlan);
    const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('OPENAI_API_KEY')}`},body:form,signal:controller.signal});
    if(!response.ok){throw new Error(response.status===401?'api_key_invalid':response.status===429?'api_quota':'generation_failed');}
    const payload=await response.json();if(!payload.data?.[0]?.b64_json)throw new Error('empty_result');resultReceived=true;
    const objectPath=`${user}/${id}/${index}.png`;
    const imageBytes=Uint8Array.from(atob(payload.data[0].b64_json),c=>c.charCodeAt(0));
    const staged=await admin.from('yourday_ai_outputs').update({object_path:objectPath}).eq('job_id',id).eq('index',index).eq('state','processing').select('index');
    if(staged.error)throw new Error('database_error');
    if(!staged.data?.length)return json({error:'cancelled'},409);
    const upload=await admin.storage.from(resultBucket).upload(objectPath,imageBytes,{contentType:'image/png',upsert:true});
    if(upload.error)throw new Error('save_failed');
    const saved=await admin.from('yourday_ai_outputs').update({state:'completed',object_path:objectPath,completed_at:new Date().toISOString(),error:null}).eq('job_id',id).eq('index',index).eq('state','processing').select('index');
    if(saved.error)throw new Error('database_error');
    if(!saved.data?.length){await admin.storage.from(resultBucket).remove([objectPath]);return json({error:'cancelled'},409);}
    return json({index});
  }catch(error){
    const code=error instanceof Error && ['api_key_invalid','api_quota','generation_failed','empty_result','database_error','save_failed'].includes(error.message)?error.message:resultReceived?'save_failed':'interrupted';
    await admin.from('yourday_ai_outputs').update({state:'failed',error:code}).eq('job_id',id).eq('index',index).eq('state','processing');
    return json({error:code},503);
  }finally{clearTimeout(timeout);activeRenders.delete(renderKey);}
}

async function removeResultCopies(id: string) {
 const rows=await admin.from('yourday_ai_outputs').select('index,object_path,delivered_at,state').eq('job_id',id);
 if(rows.error)throw new Error('database_error');
 for(const row of rows.data??[]){
  if(!row.object_path||(!row.delivered_at&&row.state!=='failed'))continue;
  const removed=await admin.storage.from(resultBucket).remove([row.object_path]);
  if(!removed.error)await admin.from('yourday_ai_outputs').update({object_path:null}).eq('job_id',id).eq('index',row.index).eq('object_path',row.object_path);
 }
}
async function cleanupResults() {
 await remaining('00000000-0000-0000-0000-000000000000');
 const rows=await admin.from('yourday_ai_outputs').select('job_id').not('object_path','is',null).or('delivered_at.not.is.null,state.eq.failed').limit(100);
 if(rows.error)throw new Error('database_error');
 for(const id of new Set((rows.data??[]).map(row=>row.job_id)))await removeResultCopies(id);
}

Deno.serve(async(req: Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try{
  const path=new URL(req.url).pathname.replace(/^.*\/yourday-ai/,'');
  if(req.method==='POST'&&path==='/cleanup'){
   const auth=await admin.rpc('yourday_ai_authorize_cleanup',{p_token:req.headers.get('x-cleanup-token')});
   if(auth.error||!auth.data)return json({error:'unauthorized'},401);
   await cleanupResults();return json({cleaned:true});
  }
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');if(!token)return json({error:'unauthorized'},401);
  const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)return json({error:'unauthorized'},401);const user=auth.data.user.id;
  if(req.method==='GET'&&path==='/health')return json({ready:Boolean(Deno.env.get('OPENAI_API_KEY')),remaining:await remaining(user)});
  const cancelMatch=path.match(/^\/jobs\/([a-zA-Z0-9-]{8,80})\/cancel$/);
  if(req.method==='POST'&&cancelMatch){
   const id=cancelMatch[1];await owned(user,id);
   // Failed slots do not consume user generation quota. Retain started_at so
   // cancelled upstream calls still count toward the separate attempt guard.
   const cancelled=await admin.from('yourday_ai_outputs').update({state:'failed',error:'cancelled'}).eq('job_id',id).is('delivered_at',null).select('index');
   if(cancelled.error)throw new Error('database_error');
   for(const output of cancelled.data??[])activeRenders.get(`${id}:${output.index}`)?.abort();
   await removeResultCopies(id);
   await admin.from('yourday_ai_notifications').delete().eq('job_id',id);
   return json({cancelled:true,remaining:await remaining(user)});
  }
  const savedMatch=path.match(/^\/jobs\/([a-zA-Z0-9-]{8,80})\/saved$/);
  if(req.method==='POST'&&savedMatch){
   const data=await body(req);
   if(!Array.isArray(data.indices)||data.indices.length<1||data.indices.length>3||!data.indices.every((value: unknown)=>Number.isInteger(value)&&Number(value)>=0&&Number(value)<=2))return json({error:'invalid_request'},400);
   const confirmed=await admin.rpc('yourday_ai_confirm_saved',{p_user:user,p_id:savedMatch[1],p_indices:data.indices});
   if(confirmed.error)return json({error:'database_error'},500);
   // Confirm disk persistence first; failed deletion is retried by the scheduler.
   await removeResultCopies(savedMatch[1]).catch(()=>undefined);
   return json({remaining:confirmed.data});
  }
  const match=path.match(/^\/jobs\/([a-zA-Z0-9-]{8,80})(?:\/render\/([0-2]))?$/);
  if(req.method==='GET'&&match&&!match[2])return json(await job(user,match[1]));
  if(req.method==='POST'&&path==='/jobs'){
   const data=await body(req);if(!/^[a-zA-Z0-9-]{8,80}$/.test(data.id)||!['face','photo'].includes(data.mode)||!Number.isInteger(data.count)||data.count<1||data.count>3)return json({error:'invalid_request'},400);
   if(data.mode==='face'){jpeg(data.reference);await validateFace(user,data.reference,Deno.env.get('OPENAI_API_KEY'));}
   const reserved=await admin.rpc('yourday_ai_reserve',{p_user:user,p_id:data.id,p_mode:data.mode,p_count:data.count});
   if(reserved.error){const code=['daily_limit','service_limit','request_conflict'].find(c=>reserved.error.message.includes(c));return json({error:code??'database_error'},code==='daily_limit'||code==='service_limit'?429:409);}
   return json(await job(user,data.id),201);
  }
  if(req.method==='POST'&&match&&match[2]){
   if(!Deno.env.get('OPENAI_API_KEY'))return json({error:'unavailable'},503);
   const current=await owned(user,match[1]);const index=Number(match[2]);if(index>=current.count)return json({error:'invalid_request'},400);
   const data=await body(req);const story=validateStory(data.story);const base=jpeg(data.base),reference=current.mode==='face'||(story?.source==='photo'&&data.reference)?jpeg(data.reference):undefined;
   if(current.mode==='face'){
    try { await validateFace(user,data.reference,Deno.env.get('OPENAI_API_KEY')); }
    catch(error){
     const code=error instanceof Error?error.message:'face_check_unavailable';
     // Legacy/recovered reservations must not keep quota for rejected photos.
     if(faceRejections.some(value=>value===code)) await admin.from('yourday_ai_outputs').update({state:'failed',error:code}).eq('job_id',match[1]).eq('state','reserved');
     throw error;
    }
   }
   const claim=await admin.rpc('yourday_ai_claim',{p_user:user,p_id:match[1],p_index:index});if(claim.error){const code=['attempt_limit','service_limit'].find(c=>claim.error.message.includes(c));return json({error:code??'database_error'},code?429:500);}
   if(!claim.data)return json(await job(user,match[1]),202);
   EdgeRuntime.waitUntil(render(user,match[1],index,current.mode,base,reference,story));
   return json({index,status:'processing'},202);
  }
  return json({error:'not_found'},404);
 }catch(error){const code=error instanceof Error?error.message:'invalid_request';return json({error:['not_found','invalid_image','too_large','database_error','face_check_unavailable',...faceRejections].includes(code)?code:'invalid_request'},code==='not_found'?404:400);}
});
