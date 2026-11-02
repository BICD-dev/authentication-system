/*
  Warnings:

  - You are about to drop the `Credential` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `ipAddress` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isBlacklisted` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isWhitelisted` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Credential_userId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Credential";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RefreshToken";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "metadata" JSONB,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "expiresAt", "id", "revokedAt", "tokenHash", "userId") SELECT "createdAt", "expiresAt", "id", "revokedAt", "tokenHash", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "emailVerifiedAt" DATETIME,
    "phone" TEXT,
    "phoneVerifiedAt" DATETIME,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "password" TEXT,
    "passwordChangedAt" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "deletedAt", "email", "firstName", "id", "lastName", "status", "updatedAt") SELECT "avatar", "createdAt", "deletedAt", "email", "firstName", "id", "lastName", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
