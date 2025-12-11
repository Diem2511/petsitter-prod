-- DDL para el proyecto Pet-Sitter Vecinal (PostgreSQL)

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

----------------------------------------------------
-- 1. TABLA DE USUARIOS (USERS)
----------------------------------------------------
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('owner', 'sitter', 'admin')),
    
    -- Seguridad y KYC
    is_kyc_verified BOOLEAN DEFAULT FALSE,
    dni_validated_at TIMESTAMP,
    
    -- Geolocalizacion (para Sitters y Dueños)
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices para busquedas rapidas
CREATE INDEX idx_user_type ON users (user_type);
CREATE INDEX idx_user_location ON users (latitude, longitude);


----------------------------------------------------
-- 2. TABLA DE MASCOTAS (PETS)
----------------------------------------------------
CREATE TABLE pets (
    pet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(user_id),
    name VARCHAR(50) NOT NULL,
    species VARCHAR(50) NOT NULL, -- Perro, Gato, etc.
    breed VARCHAR(50),
    size VARCHAR(10) CHECK (size IN ('small', 'medium', 'large')),
    notes TEXT, -- Requisitos medicos, caracter
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


----------------------------------------------------
-- 3. TABLA DE TRANSACCIONES (TRANSACTIONS - Ledger)
----------------------------------------------------
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sitter_id UUID NOT NULL REFERENCES users(user_id),
    owner_id UUID NOT NULL REFERENCES users(user_id),
    
    service_type VARCHAR(50) NOT NULL, -- Paseo, Estadia, Visita
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Financiero
    amount_total NUMERIC(10, 2) NOT NULL, -- Monto total cobrado al dueño
    fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00, -- 10% de la plataforma
    sitter_payout NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'paid')),
    
    platform_fee_id VARCHAR(50), -- ID de la retencion en MercadoPago
    sitter_payment_id VARCHAR(50), -- ID del pago dispersado
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_trans_sitter ON transactions (sitter_id);
CREATE INDEX idx_trans_owner ON transactions (owner_id);


----------------------------------------------------
-- 4. TABLA DE RESEÑAS (REVIEWS)
----------------------------------------------------
CREATE TABLE reviews (
    review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(transaction_id),
    reviewer_id UUID NOT NULL REFERENCES users(user_id), -- Dueño
    reviewed_id UUID NOT NULL REFERENCES users(user_id), -- Sitter
    
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_reviewed ON reviews (reviewed_id);


----------------------------------------------------
-- 5. TABLA DE LOGS DE AUDITORIA (AUDIT_LOGS)
----------------------------------------------------
CREATE TABLE audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    action_type VARCHAR(50) NOT NULL, -- Login, KYC_Start, Payment_Fail
    details JSONB, -- Contiene metadata adicional
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
