-- WhatsApp Sessions Table
-- Stores conversation sessions and client preferences for WhatsApp integration

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Conversation Memory (last 3 messages only)
    last_messages JSONB DEFAULT '[]'::jsonb,
    
    -- Extracted Client Preferences
    preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Session Metadata
    last_interaction TIMESTAMP DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_client ON whatsapp_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_last_interaction ON whatsapp_sessions(last_interaction);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_sessions_updated_at
    BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_sessions_updated_at();

-- RLS Policies (Enable Row Level Security)
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all sessions
CREATE POLICY "Service role can manage all whatsapp sessions"
    ON whatsapp_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read all sessions
CREATE POLICY "Authenticated users can read whatsapp sessions"
    ON whatsapp_sessions
    FOR SELECT
    TO authenticated
    USING (true);

COMMENT ON TABLE whatsapp_sessions IS 'Stores WhatsApp conversation sessions with minimal context to reduce AI token usage';
COMMENT ON COLUMN whatsapp_sessions.last_messages IS 'JSON array of last 3 messages only: [{role, content, timestamp}]';
COMMENT ON COLUMN whatsapp_sessions.preferences IS 'Extracted client preferences: {preferred_services, preferred_time, notes}';
