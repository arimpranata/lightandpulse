-- Bali Guide database schema
-- MySQL 8 / MariaDB 10.4+ (Hostinger hPanel → Databases → phpMyAdmin → Import)
--
-- Import this file first, then seed.sql. Re-importing drops and recreates every table.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS itinerary_stops;
DROP TABLE IF EXISTS itinerary_days;
DROP TABLE IF EXISTS itineraries;
DROP TABLE IF EXISTS place_tips;
DROP TABLE IF EXISTS place_highlights;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS phrases;
DROP TABLE IF EXISTS guide_tips;
DROP TABLE IF EXISTS emergency_contacts;
DROP TABLE IF EXISTS currencies;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE categories (
  id          VARCHAR(32)  NOT NULL,
  label       VARCHAR(64)  NOT NULL,
  icon        VARCHAR(32)  NOT NULL,
  color_from  CHAR(7)      NOT NULL,
  color_to    CHAR(7)      NOT NULL,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE regions (
  id          VARCHAR(32)  NOT NULL,
  label       VARCHAR(64)  NOT NULL,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE places (
  id           VARCHAR(64)    NOT NULL,
  name         VARCHAR(128)   NOT NULL,
  tagline      VARCHAR(255)   NOT NULL,
  category_id  VARCHAR(32)    NOT NULL,
  region_id    VARCHAR(32)    NOT NULL,
  area         VARCHAR(128)   NOT NULL,
  description  TEXT           NOT NULL,
  best_time    VARCHAR(128)   NOT NULL,
  hours        VARCHAR(128)   NOT NULL,
  fee          VARCHAR(128)   NOT NULL,
  duration     VARCHAR(64)    NOT NULL,
  latitude     DECIMAL(9, 6)  NOT NULL,
  longitude    DECIMAL(9, 6)  NOT NULL,
  featured     TINYINT(1)     NOT NULL DEFAULT 0,
  published    TINYINT(1)     NOT NULL DEFAULT 1,
  sort_order   SMALLINT       NOT NULL DEFAULT 0,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_places_category (category_id),
  KEY idx_places_region (region_id),
  CONSTRAINT fk_places_category FOREIGN KEY (category_id) REFERENCES categories (id) ON UPDATE CASCADE,
  CONSTRAINT fk_places_region FOREIGN KEY (region_id) REFERENCES regions (id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_highlights (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  place_id    VARCHAR(64)   NOT NULL,
  body        VARCHAR(255)  NOT NULL,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_highlights_place (place_id, sort_order),
  CONSTRAINT fk_highlights_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE place_tips (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  place_id    VARCHAR(64)   NOT NULL,
  body        VARCHAR(255)  NOT NULL,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_tips_place (place_id, sort_order),
  CONSTRAINT fk_tips_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itineraries (
  id          VARCHAR(64)   NOT NULL,
  title       VARCHAR(128)  NOT NULL,
  summary     VARCHAR(255)  NOT NULL,
  color_from  CHAR(7)       NOT NULL,
  color_to    CHAR(7)       NOT NULL,
  published   TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerary_days (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  itinerary_id  VARCHAR(64)   NOT NULL,
  title         VARCHAR(128)  NOT NULL,
  sort_order    SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_days_itinerary (itinerary_id, sort_order),
  CONSTRAINT fk_days_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itinerary_stops (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  day_id      INT UNSIGNED  NOT NULL,
  place_id    VARCHAR(64)   NOT NULL,
  time_label  VARCHAR(32)   NOT NULL,
  note        VARCHAR(255)  NOT NULL,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_stops_day (day_id, sort_order),
  CONSTRAINT fk_stops_day FOREIGN KEY (day_id) REFERENCES itinerary_days (id) ON DELETE CASCADE,
  CONSTRAINT fk_stops_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE currencies (
  code          CHAR(3)        NOT NULL,
  label         VARCHAR(64)    NOT NULL,
  per_unit_idr  DECIMAL(12, 2) NOT NULL COMMENT 'Indicative IDR for one unit of this currency',
  sort_order    SMALLINT       NOT NULL DEFAULT 0,
  updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE phrases (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  phrase      VARCHAR(128)  NOT NULL,
  meaning     VARCHAR(128)  NOT NULL,
  note        VARCHAR(255)  NULL,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guide_tips (
  id          INT UNSIGNED                    NOT NULL AUTO_INCREMENT,
  section     ENUM('essentials', 'etiquette') NOT NULL,
  icon        VARCHAR(32)                     NOT NULL,
  title       VARCHAR(128)                    NOT NULL,
  body        TEXT                            NOT NULL,
  sort_order  SMALLINT                        NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_guide_tips_section (section, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE emergency_contacts (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  icon        VARCHAR(32)   NOT NULL,
  label       VARCHAR(64)   NOT NULL,
  number      VARCHAR(32)   NOT NULL,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
