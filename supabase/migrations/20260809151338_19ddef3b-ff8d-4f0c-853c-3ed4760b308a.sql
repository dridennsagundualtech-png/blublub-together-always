
REVOKE EXECUTE ON FUNCTION public.join_couple(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_premium(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_couple_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.join_couple(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_premium(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_couple_id() TO authenticated;
