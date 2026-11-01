begin;
-- Preserve background expiry/refunds, but restore the authorized development window.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.yourday_ai_remaining(uuid)'::regprocedure);
 if position('2026-11-02 00:00:00+09' in definition)=0 then
  definition:=replace(definition,' select greatest(0,3-count(*)::integer)',
   ' if now()<timestamptz ''2026-11-02 00:00:00+09'' then return 100000; end if;'||chr(10)||' select greatest(0,3-count(*)::integer)');
  if position('2026-11-02 00:00:00+09' in definition)=0 then raise exception 'quota patch did not match'; end if;
  execute definition;
 end if;
end;
$$;
notify pgrst,'reload schema';
commit;
