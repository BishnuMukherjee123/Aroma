CREATE TYPE "CurrencyCode" AS ENUM ('USD', 'INR', 'EUR', 'GBP', 'AED');

ALTER TABLE "Dish"
ADD COLUMN "currency" "CurrencyCode" NOT NULL DEFAULT 'USD';
