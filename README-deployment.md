# API Gateway Production Deployment Guide

This guide explains how to deploy the API Gateway with Traefik reverse proxy supporting **multiple domains** with **automatic HTTPS/TLS certificates** via Let's Encrypt.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Supported Domains](#supported-domains)
4. [Quick Start](#quick-start)
5. [Configuration Details](#configuration-details)
6. [Traefik Dashboard](#traefik-dashboard)
7. [SSL Certificate Management](#ssl-certificate-management)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## Overview

The production deployment uses **Docker Compose** with **Traefik v2.11** as a reverse proxy to:

- Expose the API Gateway on **5 different domains** simultaneously
- Automatically generate and renew **free Let's Encrypt SSL certificates** for each domain
- Redirect all HTTP traffic to HTTPS
- Provide a secure Traefik dashboard for monitoring

All domains point to the same API Gateway service, providing redundancy and flexibility.

---

## Prerequisites

Before deploying, ensure you have:

1. **Docker** and **Docker Compose** installed on your server
2. **Root or sudo access** to the server
3. **All domains properly configured** in DNS pointing to your server's IP address:
   - `api.deep.assistant.run.place` → `173.212.230.201`
   - `api-deep-assistant.mooo.com` → `173.212.230.201`
   - `api-deep-assistant.yee.pw` → `173.212.230.201`
   - `assistant.yee.pw` → `173.212.230.201`
   - `api-deep-assistant.duckdns.org` → `173.212.230.201`
4. **Ports 80 and 443 open** on your firewall (required for Let's Encrypt validation)
5. **Valid email address** for Let's Encrypt notifications

---

## Supported Domains

The API Gateway is accessible via these 5 domains (all with automatic HTTPS):

| Domain | Purpose |
|--------|---------|
| `api.deep.assistant.run.place` | Primary domain |
| `api-deep-assistant.mooo.com` | Alternative domain (mooo.com free DNS) |
| `api-deep-assistant.yee.pw` | Alternative domain (yee.pw free DNS) |
| `assistant.yee.pw` | Short alternative domain |
| `api-deep-assistant.duckdns.org` | Alternative domain (DuckDNS free DNS) |

All domains serve the same API Gateway service. You can use any of them interchangeably.

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/deep-assistant/api-gateway.git
cd api-gateway
```

### 2. Create Environment File

Copy the example environment file and configure it with your values:

```bash
cp .env.example .env
```

### 3. Configure Environment Variables

Edit the `.env` file with your actual configuration:

```bash
nano .env  # or use your preferred editor
```

**Essential variables to configure:**

```env
# Email for Let's Encrypt (REQUIRED)
LETSENCRYPT_EMAIL=your-email@example.com

# Admin Token (Master Token) - CHANGE THIS!
ADMIN_FIRST=your_secure_master_token_here

# At minimum, configure one OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
```

> **Security Note**: The `.env` file contains sensitive credentials and should NEVER be committed to Git. It's already included in `.gitignore`.

### 4. Deploy the Stack

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This command will:
- Build the API Gateway container
- Start Traefik reverse proxy
- Request SSL certificates from Let's Encrypt for all 5 domains
- Set up automatic HTTP → HTTPS redirects

### 5. Verify Deployment

Check that containers are running:

```bash
docker-compose -f docker-compose.prod.yml ps
```

You should see two containers:
- `api-gateway-prod` (your API Gateway)
- `traefik-prod` (reverse proxy)

Check logs:

```bash
# API Gateway logs
docker-compose -f docker-compose.prod.yml logs -f api-gateway

# Traefik logs (including certificate generation)
docker-compose -f docker-compose.prod.yml logs -f traefik
```

### 6. Test the API

Test any of your domains:

```bash
# Test with curl
curl https://api.deep.assistant.run.place/v1/chat/completions \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Or test with another domain
curl https://api-deep-assistant.mooo.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## Configuration Details

### Environment Variables

The `.env` file contains all configuration. Here's a complete reference:

#### Server Configuration
```env
PORT=8088                          # Internal container port
```

#### Domains
```env
DOMAIN1=api.deep.assistant.run.place
DOMAIN2=api-deep-assistant.mooo.com
DOMAIN3=api-deep-assistant.yee.pw
DOMAIN4=assistant.yee.pw
DOMAIN5=api-deep-assistant.duckdns.org
```

#### Let's Encrypt
```env
LETSENCRYPT_EMAIL=admin@example.com   # Email for certificate notifications
```

#### Authentication
```env
ADMIN_FIRST=your_master_token         # Master token for admin operations
```

#### LLM Provider API Keys
Configure at least one provider. See `.env.example` for full list:
- `OPENAI_ORIGINAL_API_KEY` - Official OpenAI API
- `OPENAI_API_KEY` - GoAPI or alternative OpenAI gateway
- `DEEPSEEK_API_KEY` - DeepSeek API
- `OPENROUTER_API_KEY` - OpenRouter aggregator
- And more...

### Docker Compose Architecture

The `docker-compose.prod.yml` defines two services:

#### 1. API Gateway Service (`api-gateway`)
- **Container**: `api-gateway-prod`
- **Image**: Built from local Dockerfile
- **Port**: Internal port 8088 (not exposed externally)
- **Volumes**:
  - `./src/db` - Persistent database files
  - `./src/logs` - Application logs
- **Network**: `traefik-network` (bridge)

#### 2. Traefik Service (`traefik`)
- **Container**: `traefik-prod`
- **Image**: `traefik:v2.11`
- **Ports**:
  - `80` - HTTP (redirects to HTTPS)
  - `443` - HTTPS
- **Volumes**:
  - `./letsencrypt` - SSL certificates storage
  - `/var/run/docker.sock` - Docker socket (read-only)
- **Features**:
  - Automatic service discovery via Docker labels
  - Let's Encrypt ACME TLS challenge
  - HTTP to HTTPS redirect middleware
  - Dashboard with basic authentication

### Traefik Label System

The magic happens through Docker labels. Each domain gets its own router:

**Example for domain 1:**
```yaml
labels:
  # HTTPS router
  - "traefik.http.routers.api-gateway-domain1.rule=Host(`${DOMAIN1}`)"
  - "traefik.http.routers.api-gateway-domain1.entrypoints=websecure"
  - "traefik.http.routers.api-gateway-domain1.tls.certresolver=letsencrypt"
  - "traefik.http.routers.api-gateway-domain1.service=api-gateway"

  # HTTP to HTTPS redirect
  - "traefik.http.routers.api-gateway-domain1-http.rule=Host(`${DOMAIN1}`)"
  - "traefik.http.routers.api-gateway-domain1-http.entrypoints=web"
  - "traefik.http.routers.api-gateway-domain1-http.middlewares=redirect-to-https"
```

This pattern is repeated for all 5 domains.

---

## Traefik Dashboard

Traefik provides a web dashboard to monitor your services and routes.

### Accessing the Dashboard

The dashboard is accessible at: **https://traefik.api.deep.assistant.run.place**

**Default credentials:**
- **Username**: `admin`
- **Password**: `change_this_password`

> **⚠️ IMPORTANT**: Change the default password before production use!

### Changing the Dashboard Password

1. Generate a new password hash using `htpasswd`:

```bash
# Install htpasswd (if not already installed)
sudo apt-get install apache2-utils  # Debian/Ubuntu
sudo yum install httpd-tools         # CentOS/RHEL

# Generate password (replace 'your_password' with your actual password)
echo $(htpasswd -nB admin) | sed -e s/\\$/\\$\\$/g
```

2. Copy the output (it will look like `admin:$$2y$$05$$...`)

3. Update the label in `docker-compose.prod.yml`:

```yaml
- "traefik.http.middlewares.traefik-auth.basicauth.users=admin:$$2y$$05$$YOUR_HASH_HERE"
```

4. Restart Traefik:

```bash
docker-compose -f docker-compose.prod.yml up -d traefik
```

### Dashboard Features

- **HTTP Routers**: View all configured routes and their rules
- **Services**: Monitor backend service health
- **Middlewares**: See active middleware (redirects, auth, etc.)
- **Certificates**: Check SSL certificate status and expiration dates

---

## SSL Certificate Management

### How It Works

Traefik automatically:
1. Detects new domains from Docker labels
2. Requests SSL certificates from Let's Encrypt via **TLS-ALPN-01 challenge**
3. Stores certificates in `./letsencrypt/acme.json`
4. Automatically renews certificates before expiration (30 days)

### Certificate Storage

All certificates are stored in:
```
./letsencrypt/acme.json
```

This file contains:
- Private keys
- Certificates
- Certificate metadata

> **⚠️ SECURITY**: This file should be backed up securely and never committed to Git (already in `.gitignore`).

### Certificate Renewal

Let's Encrypt certificates are valid for **90 days**. Traefik automatically renews them when they have **30 days or less** remaining.

To check certificate status:
```bash
docker-compose -f docker-compose.prod.yml logs traefik | grep -i "certificate"
```

### Troubleshooting Certificates

If certificate generation fails:

1. **Check DNS propagation**:
   ```bash
   nslookup api.deep.assistant.run.place
   dig api.deep.assistant.run.place
   ```

2. **Verify ports 80 and 443 are open**:
   ```bash
   sudo ufw status  # Ubuntu/Debian
   sudo firewall-cmd --list-all  # CentOS/RHEL
   ```

3. **Check Traefik logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs traefik | grep -i "acme\|certificate\|error"
   ```

4. **Let's Encrypt rate limits**: If you've requested too many certificates in a short time, you may hit rate limits (5 duplicate certificates per week per domain). Wait or use staging environment.

### Testing with Let's Encrypt Staging

To test without hitting rate limits, use the staging environment:

```yaml
# In docker-compose.prod.yml, change:
- "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
```

> **Note**: Staging certificates are not trusted by browsers (you'll see security warnings).

---

## Troubleshooting

### Common Issues

#### 1. Containers fail to start

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs
```

**Common causes:**
- Missing or invalid environment variables in `.env`
- Port 80 or 443 already in use
- Docker daemon not running

#### 2. "Bad Gateway" or 502 errors

**Causes:**
- API Gateway container not running
- Wrong port mapping in labels
- Network connectivity issues

**Solution:**
```bash
# Restart the API Gateway
docker-compose -f docker-compose.prod.yml restart api-gateway

# Check if service is healthy
docker-compose -f docker-compose.prod.yml exec api-gateway curl localhost:8088
```

#### 3. SSL certificate not generated

**Causes:**
- DNS not pointing to correct IP
- Ports 80/443 blocked by firewall
- Let's Encrypt rate limit reached

**Solution:**
```bash
# Check DNS resolution
dig api.deep.assistant.run.place +short

# Verify it returns: 173.212.230.201

# Check firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### 4. "Invalid token" errors

**Causes:**
- Incorrect `ADMIN_FIRST` value
- Using wrong token in API requests

**Solution:**
```bash
# Generate a user token using the token generation script
docker-compose -f docker-compose.prod.yml exec api-gateway \
  node scripts/token-gen.js --type user --userName testuser --token 10000
```

#### 5. Provider API errors

**Causes:**
- Invalid API keys
- Provider service down
- Network connectivity issues

**Solution:**
```bash
# Check logs for provider-specific errors
docker-compose -f docker-compose.prod.yml logs api-gateway | grep -i "provider\|error"

# Test provider connectivity
docker-compose -f docker-compose.prod.yml exec api-gateway \
  curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Health Checks

Monitor your deployment:

```bash
# Check running containers
docker-compose -f docker-compose.prod.yml ps

# Check container resource usage
docker stats

# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# Check disk space (certificates and logs)
du -sh ./letsencrypt ./src/logs ./src/db
```

---

## Maintenance

### Updating the Application

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.prod.yml up -d --build

# Check that everything is working
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### Backing Up Data

**Important files to backup:**

1. **Database files** (user tokens, dialogs, etc.):
   ```bash
   tar -czf backup-db-$(date +%Y%m%d).tar.gz src/db/
   ```

2. **SSL certificates**:
   ```bash
   tar -czf backup-certs-$(date +%Y%m%d).tar.gz letsencrypt/
   ```

3. **Environment file** (sensitive):
   ```bash
   cp .env .env.backup
   ```

4. **Logs** (optional):
   ```bash
   tar -czf backup-logs-$(date +%Y%m%d).tar.gz src/logs/
   ```

### Restoring from Backup

```bash
# Stop containers
docker-compose -f docker-compose.prod.yml down

# Restore database
tar -xzf backup-db-20241108.tar.gz

# Restore certificates
tar -xzf backup-certs-20241108.tar.gz

# Restore environment
cp .env.backup .env

# Start containers
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring Logs

Application logs are stored in `./src/logs/` with automatic rotation:
- **Format**: `server.YYYY-MM-DD.N.log`
- **Retention**: 7 days
- **Max size**: 20MB per file

View logs:
```bash
# Latest application logs
tail -f src/logs/server.*.log

# Traefik access logs
docker-compose -f docker-compose.prod.yml logs -f traefik

# API Gateway container logs
docker-compose -f docker-compose.prod.yml logs -f api-gateway
```

### Scaling Considerations

**Current setup limitations:**
- Single API Gateway instance
- LowDB (JSON file-based database) - suitable for ~10k users
- No load balancing between multiple instances

**For high-traffic scenarios:**
1. **Database**: Migrate to PostgreSQL or Redis
2. **Load Balancing**: Deploy multiple API Gateway replicas
3. **Session Storage**: Use Redis for shared state
4. **Monitoring**: Add Prometheus + Grafana

### Security Best Practices

1. **Change default passwords**:
   - Traefik dashboard password
   - Master token (`ADMIN_FIRST`)

2. **Restrict Traefik dashboard access**:
   - Add IP whitelist
   - Use VPN or bastion host

3. **Keep certificates secure**:
   - Set proper file permissions: `chmod 600 letsencrypt/acme.json`
   - Regular backups to secure location

4. **Regular updates**:
   ```bash
   # Update Docker images
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Monitor logs for suspicious activity**:
   ```bash
   # Check for failed authentication attempts
   grep -i "invalid\|unauthorized\|forbidden" src/logs/server.*.log
   ```

---

## Additional Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [API Gateway Architecture](./ARCHITECTURE.md)
- [API Gateway README](./README.md)

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review container logs: `docker-compose -f docker-compose.prod.yml logs`
3. Check Traefik dashboard: `https://traefik.api.deep.assistant.run.place`
4. Open an issue on GitHub: [deep-assistant/api-gateway/issues](https://github.com/deep-assistant/api-gateway/issues)

---

**Last updated**: 2025-11-08
