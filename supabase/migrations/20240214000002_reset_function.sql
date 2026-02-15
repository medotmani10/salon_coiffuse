-- Create Reset Database Function
CREATE OR REPLACE FUNCTION reset_app_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete dependent tables first
  DELETE FROM transaction_items WHERE true;
  DELETE FROM appointment_services WHERE true;
  DELETE FROM client_payments WHERE true;
  DELETE FROM staff_payments WHERE true;
  DELETE FROM supplier_payments WHERE true;
  DELETE FROM purchase_order_items WHERE true;
  
  -- 2. Delete main transactional tables
  DELETE FROM transactions WHERE true;
  DELETE FROM appointments WHERE true;
  DELETE FROM expenses WHERE true;
  DELETE FROM purchase_orders WHERE true;
  
  -- Safe delete for chat_messages (might not exist yet)
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM chat_messages WHERE true';
  END IF;

  -- 3. Delete operational entities
  DELETE FROM products WHERE true;
  DELETE FROM clients WHERE true;
  DELETE FROM staff WHERE true;
  DELETE FROM suppliers WHERE true;
  
  -- Note: We keep 'services', 'store_settings', 'app_settings', 'user_profiles' 
  -- as these are considered configuration.
END;
$$;
