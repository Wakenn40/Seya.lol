<?php

class CryptoPay {
    private string $apiKey;
    private string $base = 'https://pay.crypt.bot/api/';

    public function __construct(string $apiKey) {
        $this->apiKey = $apiKey;
    }

    public function getMe(): array {
        return $this->call('getMe');
    }

    public function createInvoice(float $amount, string $asset = 'USDT', array $extra = []): array {
        $params = [
            'asset' => $asset,
            'amount' => $amount,
            'description' => $extra['description'] ?? 'Lifetime Premium Subscription',
            'paid_btn_name' => 'viewItem',
            'paid_btn_url' => $extra['return_url'] ?? '',
            'allow_anonymous' => false,
            'allow_comments' => false,
        ];
        return $this->call('createInvoice', $params);
    }

    public function getInvoices(array $invoiceIds = []): array {
        $params = [];
        if (!empty($invoiceIds)) {
            $params['invoice_ids'] = $invoiceIds;
        }
        return $this->call('getInvoices', $params);
    }

    public function deleteInvoice(int $invoiceId): array {
        return $this->call('deleteInvoice', ['invoice_id' => $invoiceId]);
    }

    public function setWebhook(string $url): array {
        return $this->call('setWebhook', ['url' => $url]);
    }

    public function getWebhook(): array {
        return $this->call('getWebhook');
    }

    public function deleteWebhook(): array {
        return $this->call('deleteWebhook');
    }

    private function call(string $method, array $params = []): array {
        $ch = curl_init($this->base . $method);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Crypto-Pay-API-Token: ' . $this->apiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($params),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($resp === false) {
            throw new Exception('CryptoPay API curl error: ' . $curlError);
        }

        $data = json_decode($resp, true);
        if (!$data || !isset($data['ok'])) {
            throw new Exception('CryptoPay API invalid response (http ' . $httpCode . '): ' . mb_substr($resp, 0, 500));
        }

        if (!$data['ok']) {
            $errMsg = $data['error']['message'] ?? ($data['error'] ?? 'unknown error');
            if (is_array($errMsg)) $errMsg = json_encode($errMsg);
            error_log('CryptoPay API error: http=' . $httpCode . ' response=' . mb_substr($resp, 0, 1000));
            throw new Exception('CryptoPay: ' . $errMsg);
        }

        return $data['result'] ?? $data;
    }
}
