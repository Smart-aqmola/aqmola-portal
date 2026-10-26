CREATE TABLE "Address" (
  "id" TEXT NOT NULL,
  "territoryId" TEXT NOT NULL,
  "locality" JSONB NOT NULL,
  "street" JSONB NOT NULL,
  "without" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "searchText" TEXT NOT NULL,
  CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Address_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Address_territoryId_idx" ON "Address"("territoryId");
