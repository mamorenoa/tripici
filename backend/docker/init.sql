-- Runs only on the first initialization of the Postgres volume.
-- Creates the dedicated test database next to the main one.
CREATE DATABASE tripinci_test OWNER tripinci;
