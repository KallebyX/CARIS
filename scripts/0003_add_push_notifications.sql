-- Adicionar campo para push notifications
ALTER TABLE user_settings 
ADD COLUMN push_subscription TEXT;

-- Comentário explicativo
COMMENT ON COLUMN user_settings.push_subscription IS 'JSON da subscription para push notifications';
