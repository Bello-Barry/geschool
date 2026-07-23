-- Migration: Create message_attachments table and storage bucket
-- Dependencies: messages table from 20260726000000_create_messaging.sql

-- 1. Create the message_attachments table
create table if not exists message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Index for fast lookup by message
create index if not exists idx_message_attachments_message_id on message_attachments(message_id);

-- Enable RLS
alter table message_attachments enable row level security;

-- RLS policies
-- SELECT: user must be a participant in the parent conversation
create policy "Les participants peuvent voir les pièces jointes"
  on message_attachments
  for select
  to authenticated
  using (
    exists (
      select 1 from messages m
      join conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = message_id
        and cp.user_id = auth.uid()
    )
  );

-- INSERT: user must be the sender of the parent message
create policy "L'expéditeur du message peut ajouter des pièces jointes"
  on message_attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from messages
      where messages.id = message_id
        and messages.sender_id = auth.uid()
    )
  );

-- No UPDATE policy (attachments are immutable once created)
-- No DELETE policy (only cascade from message deletion)

-- 2. Create the storage bucket for message attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do nothing;

-- Storage bucket RLS policy: authenticated users can upload
create policy "Les utilisateurs authentifiés peuvent uploader"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
  );

-- Storage bucket RLS: only participants can view/download
create policy "Seuls les participants peuvent télécharger"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'message-attachments'
  );

-- Enable realtime for message_attachments
alter publication supabase_realtime add table message_attachments;
