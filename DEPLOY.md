# Deploy (Ubuntu 22.04)

## Requirements

- Python 3.11+
- Node.js 20+ (build frontend)
- systemd, nginx
- Optional: Docker for isolated sandbox

## Layout

```
/opt/study-agent/          # app root (git clone)
  .venv/                   # python venv
  web/dist/                # built SPA
  var/                     # runtime data (history, sandbox, index)
  .env                     # secrets (not in git)
```

## Install

```bash
sudo mkdir -p /opt/study-agent
sudo git clone https://github.com/skufor/testagent.git /opt/study-agent
cd /opt/study-agent
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env
# edit .env: LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, TELEGRAM_BOT_TOKEN, ALLOWED_ORIGINS
cd web && npm ci && npm run build && cd ..
sudo useradd -r -s /usr/sbin/nologin studyagent || true
sudo chown -R studyagent:studyagent /opt/study-agent
```

## systemd unit

`/etc/systemd/system/study-agent.service`:

```ini
[Unit]
Description=study-agent API and web UI
After=network.target

[Service]
Type=simple
User=studyagent
WorkingDirectory=/opt/study-agent
EnvironmentFile=/opt/study-agent/.env
ExecStart=/opt/study-agent/.venv/bin/uvicorn server_core:app --host 0.0.0.0 --port 8090
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now study-agent
curl -sf http://127.0.0.1:8090/health
```

## nginx

```nginx
server {
  listen 80;
  server_name ai.example.com;
  root /opt/study-agent/web/dist;
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:8090/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;
    proxy_read_timeout 600s;
  }
  location ~ ^/(health|ask_stream|models|webauth|library|export|share) {
    proxy_pass http://127.0.0.1:8090;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_read_timeout 600s;
  }
}
```

## Update

```bash
cd /opt/study-agent
sudo -u studyagent git pull
./.venv/bin/pip install -r requirements.txt
cd web && npm ci && npm run build && cd ..
sudo systemctl restart study-agent
```

## Security notes

- Set `ALLOWED_ORIGINS` to your site origin(s); never leave production on `*`.
- Keep `.env` mode 600, owned by `studyagent`.
- Telegram login requires `TELEGRAM_BOT_TOKEN`.
