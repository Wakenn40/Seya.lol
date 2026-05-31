<?php

class TOTP
{
    private static $base32Map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function generateSecret($length = 20): string
    {
        $bytes = random_bytes($length);
        return self::base32Encode($bytes);
    }

    public static function getCode(string $secret, ?int $timeSlice = null): string
    {
        if ($timeSlice === null) {
            $timeSlice = (int)floor(time() / 30);
        }
        $key = self::base32Decode($secret);
        $msg = pack('J', $timeSlice);
        $hash = hash_hmac('sha1', $msg, $key, true);
        $offset = ord($hash[19]) & 0x0f;
        $code = (
            ((ord($hash[$offset]) & 0x7f) << 24) |
            ((ord($hash[$offset + 1]) & 0xff) << 16) |
            ((ord($hash[$offset + 2]) & 0xff) << 8) |
            (ord($hash[$offset + 3]) & 0xff)
        ) % 1000000;
        return str_pad((string)$code, 6, '0', STR_PAD_LEFT);
    }

    public static function verifyCode(string $secret, string $code, int $discrepancy = 1): bool
    {
        $now = (int)floor(time() / 30);
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            if (self::getCode($secret, $now + $i) === $code) {
                return true;
            }
        }
        return false;
    }

    public static function getProvisioningUri(string $secret, string $account, string $issuer = 'seya.lol'): string
    {
        $encoded = rawurlencode($issuer) . ':' . rawurlencode($account);
        return 'otpauth://totp/' . $encoded
            . '?secret=' . $secret
            . '&issuer=' . rawurlencode($issuer)
            . '&algorithm=SHA1&digits=6&period=30';
    }

    public static function getQRCodeUrl(string $secret, string $account, string $issuer = 'seya.lol'): string
    {
        $uri = self::getProvisioningUri($secret, $account, $issuer);
        return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . urlencode($uri);
    }

    private static function base32Encode(string $bytes): string
    {
        $result = '';
        $bits = 0;
        $buffer = 0;
        for ($i = 0; $i < strlen($bytes); $i++) {
            $buffer = ($buffer << 8) | ord($bytes[$i]);
            $bits += 8;
            while ($bits >= 5) {
                $bits -= 5;
                $result .= self::$base32Map[($buffer >> $bits) & 0x1f];
            }
        }
        if ($bits > 0) {
            $result .= self::$base32Map[($buffer << (5 - $bits)) & 0x1f];
        }
        return $result;
    }

    private static function base32Decode(string $data): string
    {
        $map = array_flip(str_split(self::$base32Map));
        $data = strtoupper($data);
        $result = '';
        $bits = 0;
        $buffer = 0;
        for ($i = 0; $i < strlen($data); $i++) {
            $char = $data[$i];
            if (!isset($map[$char])) continue;
            $buffer = ($buffer << 5) | $map[$char];
            $bits += 5;
            if ($bits >= 8) {
                $bits -= 8;
                $result .= chr(($buffer >> $bits) & 0xff);
            }
        }
        return $result;
    }
}
