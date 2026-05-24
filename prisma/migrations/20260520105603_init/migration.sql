-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genealogies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "created_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "genealogies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genealogy_collaborators" (
    "genealogy_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genealogy_collaborators_pkey" PRIMARY KEY ("genealogy_id","user_id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "genealogy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birth_year" INTEGER,
    "death_year" INTEGER,
    "bio" TEXT,
    "generation" INTEGER,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_child" (
    "parent_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,

    CONSTRAINT "parent_child_pkey" PRIMARY KEY ("parent_id","child_id")
);

-- CreateTable
CREATE TABLE "marriages" (
    "id" TEXT NOT NULL,
    "member1_id" TEXT NOT NULL,
    "member2_id" TEXT NOT NULL,
    "marriage_year" INTEGER,
    "divorce_year" INTEGER,

    CONSTRAINT "marriages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "members_genealogy_id_idx" ON "members"("genealogy_id");

-- CreateIndex
CREATE INDEX "members_name_idx" ON "members"("name");

-- CreateIndex
CREATE INDEX "parent_child_parent_id_idx" ON "parent_child"("parent_id");

-- CreateIndex
CREATE INDEX "parent_child_child_id_idx" ON "parent_child"("child_id");

-- CreateIndex
CREATE INDEX "marriages_member1_id_idx" ON "marriages"("member1_id");

-- CreateIndex
CREATE INDEX "marriages_member2_id_idx" ON "marriages"("member2_id");

-- AddForeignKey
ALTER TABLE "genealogies" ADD CONSTRAINT "genealogies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genealogy_collaborators" ADD CONSTRAINT "genealogy_collaborators_genealogy_id_fkey" FOREIGN KEY ("genealogy_id") REFERENCES "genealogies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genealogy_collaborators" ADD CONSTRAINT "genealogy_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_genealogy_id_fkey" FOREIGN KEY ("genealogy_id") REFERENCES "genealogies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marriages" ADD CONSTRAINT "marriages_member1_id_fkey" FOREIGN KEY ("member1_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marriages" ADD CONSTRAINT "marriages_member2_id_fkey" FOREIGN KEY ("member2_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
