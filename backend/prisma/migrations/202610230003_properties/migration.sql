CREATE TYPE "PropertyType" AS ENUM ('apartment', 'house', 'non_residential', 'other');
CREATE TYPE "PropertyRelation" AS ENUM ('owner', 'representative', 'tenant', 'lawful_user');
CREATE TABLE "Property" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "territoryId" TEXT NOT NULL,
  "locality" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "house" TEXT NOT NULL,
  "flat" TEXT,
  "type" "PropertyType" NOT NULL,
  "relation" "PropertyRelation" NOT NULL,
  "personalAccount" TEXT,
  "ownerInfo" TEXT NOT NULL,
  "addressId" TEXT,
  "verification" JSONB NOT NULL DEFAULT '{"status":"unverified","documents":[]}',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Property_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Property_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Property_ownerId_createdAt_idx" ON "Property"("ownerId", "createdAt");
CREATE INDEX "Property_territoryId_idx" ON "Property"("territoryId");
