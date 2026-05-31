-- Run this in phpMyAdmin to create the required tables

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    token VARCHAR(255),
    email VARCHAR(255) DEFAULT NULL,
    email_verified TINYINT(1) DEFAULT 0,
    email_code VARCHAR(6) DEFAULT NULL,
    email_code_expires INT DEFAULT 0,
    totp_secret VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    published BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(255) DEFAULT '',
    display_name_html TEXT DEFAULT '',
    bio TEXT DEFAULT 'Hey, this is my page ✨',
    bio_html TEXT DEFAULT 'Hey, this is my page ✨',
    avatar LONGTEXT DEFAULT '',
    music_src LONGTEXT DEFAULT '',
    music_name VARCHAR(255) DEFAULT '',
    music_gain DECIMAL(5,3) DEFAULT 1,
    music_volume DECIMAL(5,3) DEFAULT 1,
    links_enabled BOOLEAN DEFAULT FALSE,
    links JSON,
    bg VARCHAR(50) DEFAULT 'bg-black',
    bg_image_global LONGTEXT DEFAULT '',
    bg_image_phone LONGTEXT DEFAULT '',
    bg_phone_opacity DECIMAL(5,3) DEFAULT 1,
    deleted_avatar BOOLEAN DEFAULT FALSE,
    fade_in BOOLEAN DEFAULT FALSE,
    deleted_name BOOLEAN DEFAULT FALSE,
    deleted_bio BOOLEAN DEFAULT FALSE,
    deleted_phone BOOLEAN DEFAULT FALSE,
    btn_style VARCHAR(50) DEFAULT '',
    accent_color VARCHAR(20) DEFAULT '#d6d6d6',
    font VARCHAR(50) DEFAULT 'Syne',
    name_size INT DEFAULT 22,
    text_manual_size JSON,
    custom_objects JSON,
    custom_object_counter INT DEFAULT 0,
    animations JSON,
    phone_frame_image LONGTEXT DEFAULT '',
    cursor_image LONGTEXT DEFAULT '',
    cursor_size INT DEFAULT 32,
    phone_blur BOOLEAN DEFAULT FALSE,
    phone_blur_strength INT DEFAULT 3,
    phone_border_radius INT DEFAULT 42,
    effects JSON,
    click_to_enter JSON,
    layout JSON,
    discord_id VARCHAR(50) DEFAULT '',
    discord_username VARCHAR(100) DEFAULT '',
    discord_avatar VARCHAR(100) DEFAULT '',
    discord_discriminator VARCHAR(10) DEFAULT '0',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    tags JSON,
    description TEXT DEFAULT '',
    page_data JSON NOT NULL,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS premium_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    invoice_id BIGINT DEFAULT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_aliases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    alias VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;