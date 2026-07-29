-- Tier A now means "casual/default" and Tier C now means "most valued/best price"
-- (previously reversed). Swap existing User.priceTier values so real customers keep
-- the same actual pricing they had before this relabeling — only the letter changes.
UPDATE "User" SET "priceTier" = 'TMP' WHERE "priceTier" = 'A';
UPDATE "User" SET "priceTier" = 'A' WHERE "priceTier" = 'C';
UPDATE "User" SET "priceTier" = 'C' WHERE "priceTier" = 'TMP';

ALTER TABLE "User" ALTER COLUMN "priceTier" SET DEFAULT 'A';
