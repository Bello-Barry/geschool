-- =========================================
-- MESSAGERIE EN TEMPS RÉEL
-- conversations, participants, messages
-- =========================================

-- 1. CONVERSATIONS
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  title TEXT,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_school ON conversations(school_id);

-- 2. CONVERSATION PARTICIPANTS
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_cp_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_cp_user ON conversation_participants(user_id);

-- 3. MESSAGES
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- 4. ROW LEVEL SECURITY

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations : l'utilisateur voit ses propres conversations
CREATE POLICY "conversations_select" ON conversations
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
  AND school_id = (SELECT school_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "conversations_insert" ON conversations
FOR INSERT TO authenticated
WITH CHECK (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "conversations_update" ON conversations
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND school_id = (SELECT school_id FROM users WHERE id = auth.uid())
);

-- Participants : l'utilisateur voit les participants de ses conversations
CREATE POLICY "cp_select" ON conversation_participants
FOR SELECT TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "cp_insert" ON conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
  OR
  conversation_id IN (
    SELECT id FROM conversations WHERE created_by = auth.uid()
  )
);

-- Messages : l'utilisateur voit les messages de ses conversations
CREATE POLICY "messages_select" ON messages
FOR SELECT TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert" ON messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- 5. REALTIME (messages seulement)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
