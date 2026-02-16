-- Add booking_context field to whatsapp_sessions
-- This field stores the current booking state and conversation flow

ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS booking_context JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN whatsapp_sessions.booking_context IS 
'Stores current booking conversation state: {
  stage: "collecting_service" | "collecting_date" | "collecting_time" | "confirming" | "completed",
  service: string | null,
  service_id: uuid | null,
  date: string | null,
  time: string | null,
  staff_preference: string | null,
  client_name: string | null,
  last_question: string | null,
  missing_info: string[]
}';

-- Update existing rows to have empty booking_context
UPDATE whatsapp_sessions 
SET booking_context = '{}'::jsonb 
WHERE booking_context IS NULL;
