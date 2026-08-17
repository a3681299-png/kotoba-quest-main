-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stageIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StageCode" (
    "userId" TEXT NOT NULL,
    "stageId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "rulesJson" TEXT,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("userId", "stageId"),
    CONSTRAINT "StageCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
