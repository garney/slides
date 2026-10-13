-- Bootstrap: database and application user (requires MySQL admin privileges).
-- Not applied by `npm run migrate` or the Argo pre-sync Job (000_* files are skipped).
--
-- 1. Replace CHANGE_ME_STRONG_PASSWORD with the app password stored in Secrets Manager
--    (same value embedded in DATABASE_URL for {env}/my-slides).
-- 2. Run once per environment with admin credentials:
--      mysql -h <host> -u <admin_user> -p < db/migrations/000_create_database.sql
--
-- Local Docker Compose already creates MYSQL_DATABASE / MYSQL_USER via the db service env;
-- use this script for RDS or shared MySQL where the app user does not exist yet.

CREATE DATABASE IF NOT EXISTS `my_slides`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'astro_my_slides'@'%'
  IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
ALTER USER IF EXISTS 'astro_my_slides'@'%'
  IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

GRANT ALL PRIVILEGES ON `my_slides`.* TO 'astro_my_slides'@'%';

FLUSH PRIVILEGES;
