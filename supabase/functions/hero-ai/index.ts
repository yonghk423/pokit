import { faceRejections, validateFace } from './faceValidation.ts';
import { generationRequest, validateStory, type HeroStory } from './generationRequest.ts';
import { notifyCompletion } from './notify.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
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
const remaining = async (user: string) => { const { data,error }=await admin.rpc('hero_ai_remaining',{p_user:user});if(error)throw new Error('database_error');return data as number; };
async function owned(user: string,id: string) {
  const {data,error}=await admin.from('hero_ai_jobs').select('*').eq('id',id).eq('user_id',user).maybeSingle();
  if(error||!data)throw new Error('not_found');return data;
}
async function job(user: string,id: string) {
  await owned(user,id);
  // An interrupted call may have been billed. Do not auto-repeat it or release that quota.
  await admin.from('hero_ai_outputs').update({state:'uncertain',error:'interrupted'}).eq('job_id',id).eq('state','processing').lt('started_at',new Date(Date.now()-180000).toISOString());
  const {data,error}=await admin.from('hero_ai_outputs').select('*').eq('job_id',id).order('index');if(error)throw new Error('database_error');
  const outputs=data??[]; const results=[];
  for(const output of outputs.filter(o=>o.state==='completed'&&o.object_path)){
    const signed=await admin.storage.from('hero-ai-results').createSignedUrl(output.object_path,300);
    if(signed.error)throw new Error('storage_error');results.push({index:output.index,url:signed.data.signedUrl});
  }
  const processing=outputs.some(o=>o.state==='reserved'||o.state==='processing');
  return { id,status:processing?'processing':outputs.every(o=>o.state==='completed')?'completed':'failed',results,
    remaining:await remaining(user),error:outputs.find(o=>o.error)?.error, pending:outputs.filter(o=>o.state==='reserved').map(o=>o.index) };
}
async function render(user: string,id: string,index: number,mode: string,base: Blob,reference?: Blob,story?: HeroStory) {
  let rejected=false;let resultReceived=false;
  const renderKey=`${id}:${index}`, controller=new AbortController();
  activeRenders.set(renderKey,controller);
  const timeout=setTimeout(()=>controller.abort(),110000);
  try{
    const current=await admin.from('hero_ai_outputs').select('state').eq('job_id',id).eq('index',index).single();
    if(current.error)throw new Error('database_error');
    if(current.data.state!=='processing'){clearTimeout(timeout);activeRenders.delete(renderKey);return;}
    const form=generationRequest(mode,base,reference,story);
    const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('OPENAI_API_KEY')}`},body:form,signal:controller.signal});
    if(!response.ok){rejected=true;throw new Error(response.status===401?'api_key_invalid':response.status===429?'api_quota':'generation_failed');}
    const payload=await response.json();if(!payload.data?.[0]?.b64_json)throw new Error('empty_result');resultReceived=true;
    const bytes=Uint8Array.from(atob(payload.data[0].b64_json),c=>c.charCodeAt(0));
    const path=`${user}/${id}/${index}.png`;
    const upload=await admin.storage.from('hero-ai-results').upload(path,bytes,{contentType:'image/png',upsert:false});
    if(upload.error)throw new Error('storage_error');
    const saved=await admin.from('hero_ai_outputs').update({state:'completed',object_path:path,error:null}).eq('job_id',id).eq('index',index).eq('state','processing').select('index');
    if(!saved.error&&!saved.data?.length)await admin.storage.from('hero-ai-results').remove([path]);
    if(saved.error)throw new Error('database_error');
  }catch(error){
    await admin.from('hero_ai_outputs').update({state:rejected?'failed':'uncertain',error:error instanceof Error && ['api_key_invalid','api_quota','generation_failed','empty_result','storage_error','database_error'].includes(error.message)?error.message:resultReceived?'save_failed':'interrupted'}).eq('job_id',id).eq('index',index).eq('state','processing');
  }
  clearTimeout(timeout);activeRenders.delete(renderKey);
  await notifyCompletion(admin,id,Deno.env.get('EXPO_ACCESS_TOKEN')).catch(() => undefined);
}
async function cleanup(){
 const {data:outputs,error}=await admin.from('hero_ai_outputs').select('job_id,index,object_path,hero_ai_jobs!inner(created_at)').lt('hero_ai_jobs.created_at',new Date(Date.now()-24*3600000).toISOString()).not('object_path','is',null).limit(100);
 if(error)throw new Error('database_error');
 if(outputs?.length){const removed=await admin.storage.from('hero-ai-results').remove(outputs.map(o=>o.object_path!));if(removed.error)throw new Error('storage_error');
  for(const o of outputs)await admin.from('hero_ai_outputs').update({object_path:null}).eq('job_id',o.job_id).eq('index',o.index);}
}
Deno.serve(async(req: Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try{
  const path=new URL(req.url).pathname.replace(/^.*\/hero-ai/,'');
  if(path==='/cleanup'){
   if(req.method!=='POST'||!Deno.env.get('HERO_AI_CLEANUP_TOKEN')||req.headers.get('x-cleanup-token')!==Deno.env.get('HERO_AI_CLEANUP_TOKEN'))return json({error:'unauthorized'},401);
   await cleanup();return json({ok:true});
  }
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');if(!token)return json({error:'unauthorized'},401);
  const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)return json({error:'unauthorized'},401);const user=auth.data.user.id;
  if(req.method==='GET'&&path==='/health')return json({ready:Boolean(Deno.env.get('OPENAI_API_KEY')),remaining:await remaining(user)});
  const cancelMatch=path.match(/^\/jobs\/([a-zA-Z0-9-]{8,80})\/cancel$/);
  if(req.method==='POST'&&cancelMatch){
   const id=cancelMatch[1];await owned(user,id);
   // Failed slots do not consume user generation quota. Retain started_at so
   // cancelled upstream calls still count toward the separate attempt guard.
   const cancelled=await admin.from('hero_ai_outputs').update({state:'failed',error:'cancelled'}).eq('job_id',id).select('index,object_path');
   if(cancelled.error)throw new Error('database_error');
   for(const output of cancelled.data??[])activeRenders.get(`${id}:${output.index}`)?.abort();
   await admin.from('hero_ai_notifications').delete().eq('job_id',id);
   const paths=(cancelled.data??[]).map(o=>o.object_path).filter(Boolean);
   if(paths.length)await admin.storage.from('hero-ai-results').remove(paths);
   return json({cancelled:true,remaining:await remaining(user)});
  }
  const notificationMatch=path.match(/^\/jobs\/([a-zA-Z0-9-]{8,80})\/notification$/);
  if(req.method==='POST'&&notificationMatch){
   const id=notificationMatch[1];await owned(user,id);const data=await body(req);
   if(typeof data.token!=='string'||data.token.length>250||! /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(data.token)||!['ko','en','ja','zh-TW'].includes(data.locale))return json({error:'invalid_request'},400);
   const {error}=await admin.from('hero_ai_notifications').upsert({job_id:id,push_token:data.token,locale:data.locale},{onConflict:'job_id',ignoreDuplicates:true});
   if(error)return json({error:'database_error'},500);
   EdgeRuntime.waitUntil(notifyCompletion(admin,id,Deno.env.get('EXPO_ACCESS_TOKEN')).catch(()=>undefined));
   return json({ok:true});
  }
  const match=path.match(/^\/jobs\/([a-zA-Z0-9-]{8,80})(?:\/render\/([0-2]))?$/);
  if(req.method==='GET'&&match&&!match[2])return json(await job(user,match[1]));
  if(req.method==='POST'&&path==='/jobs'){
   const data=await body(req);if(!/^[a-zA-Z0-9-]{8,80}$/.test(data.id)||!['face','photo'].includes(data.mode)||!Number.isInteger(data.count)||data.count<1||data.count>3)return json({error:'invalid_request'},400);
   if(data.mode==='face'){jpeg(data.reference);await validateFace(user,data.reference,Deno.env.get('OPENAI_API_KEY'));}
   const reserved=await admin.rpc('hero_ai_reserve',{p_user:user,p_id:data.id,p_mode:data.mode,p_count:data.count});
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
     if(faceRejections.some(value=>value===code)) await admin.from('hero_ai_outputs').update({state:'failed',error:code}).eq('job_id',match[1]).eq('state','reserved');
     throw error;
    }
   }
   const claim=await admin.rpc('hero_ai_claim',{p_user:user,p_id:match[1],p_index:index});if(claim.error){const code=['attempt_limit','service_limit'].find(c=>claim.error.message.includes(c));return json({error:code??'database_error'},code?429:500);}
   if(claim.data)EdgeRuntime.waitUntil(render(user,match[1],index,current.mode,base,reference,story));
   return json({accepted:true},202);
  }
  return json({error:'not_found'},404);
 }catch(error){const code=error instanceof Error?error.message:'invalid_request';return json({error:['not_found','invalid_image','too_large','database_error','face_check_unavailable',...faceRejections].includes(code)?code:'invalid_request'},code==='not_found'?404:400);}
});
