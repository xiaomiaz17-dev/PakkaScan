-- Session 7: DC Rate / FBR Valuation Lookup Engine
CREATE TABLE IF NOT EXISTS dc_rates (
  id            bigserial PRIMARY KEY,
  province      text NOT NULL,
  city          text NOT NULL,
  area          text NOT NULL,
  phase_or_block text,
  sub_block     text,
  category      text NOT NULL DEFAULT 'residential',
  plot_type     text,
  rate_pkr      numeric(14,2) NOT NULL,
  rate_unit     text NOT NULL CHECK (rate_unit IN ('PKR_PER_MARLA','PKR_PER_SQYD','PKR_PER_KANAL','PKR_PER_SQFT','per_marla','per_sq_yd','per_sq_ft','per_kanal')),
  source_type   text NOT NULL DEFAULT 'DC_RATE',
  effective_date date,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dc_rates_lookup
  ON dc_rates (lower(city), lower(area), lower(category));

CREATE INDEX IF NOT EXISTS idx_dc_rates_phase
  ON dc_rates (lower(city), lower(area), lower(coalesce(phase_or_block,'')), lower(category));

CREATE INDEX IF NOT EXISTS idx_dc_rates_province_city
  ON dc_rates (lower(province), lower(city));

-- Source provenance (Session 7 VA data)
ALTER TABLE dc_rates
  ADD COLUMN IF NOT EXISTS source_document text,
  ADD COLUMN IF NOT EXISTS source_page integer;

-- Expand allowed rate units for FBR published units
ALTER TABLE dc_rates DROP CONSTRAINT IF EXISTS dc_rates_rate_unit_check;
ALTER TABLE dc_rates ADD CONSTRAINT dc_rates_rate_unit_check
  CHECK (rate_unit IN (
    'PKR_PER_MARLA','PKR_PER_SQYD','PKR_PER_KANAL','PKR_PER_SQFT',
    'per_marla','per_sq_yd','per_sq_ft','per_kanal'
  ));
