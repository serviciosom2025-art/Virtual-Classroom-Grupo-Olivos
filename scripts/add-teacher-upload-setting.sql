-- Add allow_teacher_file_upload column to platform_settings
-- Default is true (teachers can upload files by default)
ALTER TABLE platform_settings 
ADD COLUMN IF NOT EXISTS allow_teacher_file_upload BOOLEAN DEFAULT true;

-- Update existing rows to have the default value
UPDATE platform_settings 
SET allow_teacher_file_upload = true 
WHERE allow_teacher_file_upload IS NULL;
