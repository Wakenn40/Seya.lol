<?php
// ================================================
// SMTP CONFIG — Fill in your Gmail App Password
// ================================================
// 1. Go to https://myaccount.google.com/security
// 2. Enable 2-Step Verification
// 3. Go to "App passwords" (search in Google Account)
// 4. Select "Mail" + "Other" → name "seya.lol"
// 5. Copy the 16-char password below
// ================================================

define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'plokedtwich@gmail.com');        // ← YOUR GMAIL
define('SMTP_PASS', 'xddf rwtz blpq pjf');          // ← APP PASSWORD
define('SMTP_FROM', 'plokedtwich@gmail.com');          // ← SAME AS USER
define('SMTP_FROM_NAME', 'seya.lol');
