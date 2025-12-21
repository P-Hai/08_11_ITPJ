-- =====================================================
-- MFA EMAIL OTP SYSTEM
-- =====================================================

-- Extension UUID (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: mfa_settings (Cấu hình MFA cho từng user)
-- =====================================================
CREATE TABLE IF NOT EXISTS mfa_settings (
    mfa_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- MFA Configuration
    mfa_enabled BOOLEAN DEFAULT true,
    mfa_method VARCHAR(20) DEFAULT 'email', -- 'email', 'sms', 'totp'
    
    -- Email configuration
    email_verified BOOLEAN DEFAULT true,
    
    -- Metadata
    last_mfa_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: mfa_challenges (Lưu OTP tạm thời)
-- =====================================================
CREATE TABLE IF NOT EXISTS mfa_challenges (
    challenge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Challenge data
    challenge_type VARCHAR(20) NOT NULL DEFAULT 'email',
    challenge_code VARCHAR(10) NOT NULL, -- OTP 6 số
    
    -- Status
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Expiration
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    
    -- Security audit
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_mfa_settings_user ON mfa_settings(user_id);
CREATE INDEX idx_mfa_challenges_user ON mfa_challenges(user_id);
CREATE INDEX idx_mfa_challenges_expires ON mfa_challenges(expires_at);
CREATE INDEX idx_mfa_challenges_verified ON mfa_challenges(verified);

-- =====================================================
-- DEFAULT MFA SETTINGS FOR EXISTING STAFF
-- =====================================================
INSERT INTO mfa_settings (user_id, mfa_enabled, mfa_method, email_verified)
SELECT 
    user_id,
    CASE 
        WHEN role IN ('doctor', 'nurse', 'receptionist', 'admin') THEN true
        ELSE false
    END as mfa_enabled,
    'email' as mfa_method,
    true as email_verified
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM mfa_settings WHERE mfa_settings.user_id = users.user_id
);

-- =====================================================
-- CLEANUP FUNCTION (Xóa OTP hết hạn)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM mfa_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE mfa_settings IS 'MFA configuration for each user';
COMMENT ON TABLE mfa_challenges IS 'Temporary OTP challenges for email MFA';
COMMENT ON COLUMN mfa_challenges.challenge_code IS '6-digit OTP code';
COMMENT ON COLUMN mfa_challenges.expires_at IS 'OTP expires after 5 minutes';