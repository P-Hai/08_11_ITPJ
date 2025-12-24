-- backend/migrations/003_add_webauthn.sql
-- WebAuthn Biometric Authentication Tables

-- Table: webauthn_credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    credential_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- WebAuthn data
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    
    -- Device info
    device_type VARCHAR(50), -- 'fingerprint', 'face', 'security_key'
    device_name VARCHAR(255),
    
    -- Authenticator info
    aaguid TEXT,
    credential_public_key TEXT,
    
    -- Metadata
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_webauthn_user ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_active ON webauthn_credentials(is_active);

COMMENT ON TABLE webauthn_credentials IS 'WebAuthn biometric credentials for passwordless login';

-- Table: webauthn_challenges (temporary storage for registration/authentication)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

COMMENT ON TABLE webauthn_challenges IS 'Temporary storage for WebAuthn challenges during registration/authentication';