ALTER TABLE "Restaurant"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Restaurant_isActive_idx" ON "Restaurant"("isActive");
