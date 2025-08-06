-- SQL Script for creating the Joy of Painting Database
-- Dialect: PostgreSQL

-- Drop tables if they exist to ensure a clean slate
DROP TABLE IF EXISTS "episode_subjects";
DROP TABLE IF EXISTS "episode_colors";
DROP TABLE IF EXISTS "subjects";
DROP TABLE IF EXISTS "colors";
DROP TABLE IF EXISTS "episodes";

-- Create the master table for all unique subjects
CREATE TABLE "subjects" (
  "subject_id" SERIAL PRIMARY KEY,
  "subject_name" VARCHAR(255) UNIQUE NOT NULL
);

-- Create the master table for all unique colors
CREATE TABLE "colors" (
  "color_id" SERIAL PRIMARY KEY,
  "color_name" VARCHAR(255) UNIQUE NOT NULL
);

-- Create the central table for all episode information
CREATE TABLE "episodes" (
  "episode_id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "season" INT NOT NULL,
  "episode_number" INT NOT NULL,
  "broadcast_date" DATE
);

-- Create the junction table to link episodes and colors (Many-to-Many)
CREATE TABLE "episode_colors" (
  "episode_id" INT REFERENCES "episodes"("episode_id") ON DELETE CASCADE,
  "color_id" INT REFERENCES "colors"("color_id") ON DELETE CASCADE,
  PRIMARY KEY ("episode_id", "color_id")
);

-- Create the junction table to link episodes and subjects (Many-to-Many)
CREATE TABLE "episode_subjects" (
  "episode_id" INT REFERENCES "episodes"("episode_id") ON DELETE CASCADE,
  "subject_id" INT REFERENCES "subjects"("subject_id") ON DELETE CASCADE,
  PRIMARY KEY ("episode_id", "subject_id")
);
