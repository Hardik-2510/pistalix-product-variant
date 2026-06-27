-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "planName" TEXT,
    "planTier" TEXT,
    "billingInterval" TEXT
);

-- CreateTable
CREATE TABLE "OptionSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OptionSet_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "title" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "styles" TEXT,
    CONSTRAINT "Section_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Element" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "subtext" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Element_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Element_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetValues" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "ProductRule_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE INDEX "OptionSet_shopId_idx" ON "OptionSet"("shopId");

-- CreateIndex
CREATE INDEX "Section_optionSetId_idx" ON "Section"("optionSetId");

-- CreateIndex
CREATE INDEX "Element_optionSetId_idx" ON "Element"("optionSetId");

-- CreateIndex
CREATE INDEX "Element_sectionId_idx" ON "Element"("sectionId");

-- CreateIndex
CREATE INDEX "ProductRule_optionSetId_idx" ON "ProductRule"("optionSetId");
