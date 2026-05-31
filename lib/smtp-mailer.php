<?php

class SmtpMailer {
    private $host;
    private $port;
    private $user;
    private $pass;
    private $from;
    private $fromName;
    private $socket;
    private $lastLog;

    public function __construct($host, $port, $user, $pass, $from, $fromName = '') {
        $this->host = $host;
        $this->port = $port;
        $this->user = $user;
        $this->pass = $pass;
        $this->from = $from;
        $this->fromName = $fromName ?: $from;
    }

    public function send($to, $subject, $body) {
        $this->lastLog = '';
        $this->socket = @fsockopen($this->host, $this->port, $errno, $errstr, 30);
        if (!$this->socket) {
            throw new Exception("Connection failed: $errstr ($errno)");
        }

        $this->read();
        $this->write("EHLO seya.lol");
        $this->read();

        $this->write("STARTTLS");
        $this->read();

        if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception("TLS negotiation failed");
        }

        $this->write("EHLO seya.lol");
        $this->read();

        $this->write("AUTH LOGIN");
        $this->read();
        $this->write(base64_encode($this->user));
        $this->read();
        $this->write(base64_encode($this->pass));
        $authResp = $this->read();

        if (strpos($authResp, '235') === false && strpos($authResp, '334') === false) {
            $this->write("AUTH PLAIN " . base64_encode("\0" . $this->user . "\0" . $this->pass));
            $authResp = $this->read();
        }

        if (strpos($authResp, '235') === false && strpos($authResp, '334') === false) {
            $this->close();
            throw new Exception("Authentication failed: " . substr($authResp, 0, 100));
        }

        $this->write("MAIL FROM:<{$this->from}>");
        $this->read();

        $this->write("RCPT TO:<$to>");
        $this->read();

        $this->write("DATA");
        $this->read();

        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$this->fromName} <{$this->from}>\r\n";
        $headers .= "To: <$to>\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "Date: " . date('r') . "\r\n";

        $this->write($headers . "\r\n" . $body . "\r\n.");
        $this->read();

        $this->write("QUIT");
        $this->read();
        $this->close();

        return true;
    }

    private function write($data) {
        fwrite($this->socket, $data . "\r\n");
        $this->lastLog .= ">>> $data\n";
    }

    private function read() {
        $response = '';
        while ($line = fgets($this->socket, 512)) {
            $response .= $line;
            $this->lastLog .= "<<< $line";
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $response;
    }

    private function close() {
        if ($this->socket) {
            fclose($this->socket);
            $this->socket = null;
        }
    }

    public function getLastLog() {
        return $this->lastLog;
    }
}
