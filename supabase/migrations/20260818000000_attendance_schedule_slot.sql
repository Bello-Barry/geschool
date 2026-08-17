-- Chantier 21: Présences par créneau (schedule_slot_id optionnel sur attendance)

-- 1. Ajouter la colonne schedule_slot_id (optionnelle)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE SET NULL;

-- 2. Remplacer la contrainte UNIQUE(student_id, date) :
--    - l'appel du jour par défaut reste unique par (student_id, date) quand aucun créneau n'est précisé
--    - un appel par créneau est unique par (student_id, date, schedule_slot_id)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_date_default
  ON attendance(student_id, date)
  WHERE schedule_slot_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_date_slot
  ON attendance(student_id, date, schedule_slot_id)
  WHERE schedule_slot_id IS NOT NULL;

-- 3. Index pour requêtes par créneau
CREATE INDEX IF NOT EXISTS idx_attendance_schedule_slot ON attendance(schedule_slot_id);

-- 4. Mettre à jour l'index existant pour couvrir le créneau
DROP INDEX IF EXISTS idx_attendance_student_date;
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date, schedule_slot_id);

-- 5. RLS inchangée : les politiques publiques sur SELECT/INSERT utilisent school_id/status, rien à ajouter.