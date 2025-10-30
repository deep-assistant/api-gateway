# Cursor IDE Setup Guide

This guide explains how to configure Cursor IDE to use the Deep Assistant API Gateway as your OpenAI provider.

## Overview

Cursor IDE supports overriding the OpenAI base URL, which allows you to use the Deep Assistant API Gateway instead of the official OpenAI API. This gives you access to multiple LLM providers with automatic failover, cost optimization through the energy token system, and support for various models including GPT-4o, Claude, DeepSeek, and more.

## Prerequisites

1. Cursor IDE installed on your system
2. Access to a running Deep Assistant API Gateway instance
3. An admin token (API key) from the gateway administrator

## Configuration Steps

### 1. Open Cursor Settings

In Cursor IDE:
- Click on the settings icon (gear icon) or press `Cmd+,` (Mac) / `Ctrl+,` (Windows/Linux)
- Navigate to the **Features** section
- Find **Models** or **OpenAI API Key** settings

### 2. Configure API Key

1. Enable the toggle for **"OpenAI API Key"**
2. Enter your API key (admin token) in the password field
   - This should be your Deep Assistant admin token (not an OpenAI key)

### 3. Override Base URL

1. Enable the toggle for **"Override OpenAI Base URL (when using key)"**
2. Enter your API Gateway base URL in the format:
   ```
   https://api.deep-foundation.tech/v1
   ```
   or for local development:
   ```
   http://localhost:8088/v1
   ```

**Important:** The URL must end with `/v1` to match OpenAI's API structure.

### 4. Save and Verify

1. Click the **Verify** button next to the API key field to test the connection
2. If successful, Cursor will confirm that it can connect to your API Gateway
3. Click **Save** to apply the settings

## Screenshot

Here's what your configuration should look like:

![Cursor Settings](https://github.com/user-attachments/assets/d31f2279-8b28-4c1f-aa0d-ea7caf8c24a6)

## Available Models

Once configured, you'll have access to all models supported by the API Gateway:

### OpenAI Models
- `gpt-4o` - GPT-4 Omni (recommended for most tasks)
- `gpt-4o-mini` - Smaller, faster GPT-4 variant
- `gpt-3.5-turbo` - Fast and cost-effective
- `o1-preview` - Advanced reasoning model
- `o1-mini` - Smaller reasoning model
- `o3-mini` - Latest reasoning model

### Anthropic Claude Models
- `claude-sonnet-4` - Latest Claude Sonnet
- `claude-3-7-sonnet` - Claude 3.7 Sonnet
- `claude-3-5-sonnet` - Claude 3.5 Sonnet
- `claude-3-5-haiku` - Fast Claude variant
- `claude-3-opus` - Most capable Claude model

### DeepSeek Models
- `deepseek-chat` - DeepSeek conversational model
- `deepseek-reasoner` - DeepSeek reasoning model

### Open Source Models
- `meta-llama/Meta-Llama-3.1-405B` - Large Llama model
- `meta-llama/Meta-Llama-3.1-70B` - Medium Llama model
- `meta-llama/Meta-Llama-3.1-8B` - Small Llama model
- `microsoft/WizardLM-2-8x22B` - WizardLM large
- `microsoft/WizardLM-2-7B` - WizardLM small

### Other Models
- `gpt-4.1` - Custom GPT-4.1 (via GoAPI)
- `gpt-4.1-mini` - Custom GPT-4.1 mini
- `gpt-4.1-nano` - Custom GPT-4.1 nano
- `gpt-auto` - Automatic model selection
- `uncensored` - Uncensored small model

## Testing Your Setup

To verify your setup is working:

1. Open a new chat in Cursor
2. Select one of the available models from the dropdown
3. Send a test message
4. You should receive a response from the API Gateway

## Troubleshooting

### Connection Errors

**Issue:** "Problem reaching OpenAI" error

**Solutions:**
1. Verify your base URL is correct and ends with `/v1`
2. Check that your API Gateway is running and accessible
3. Ensure your API key (admin token) is valid
4. Check firewall/network settings if using a remote gateway

### Model Not Found

**Issue:** Selected model returns "model not found" error

**Solutions:**
1. Call `GET https://your-gateway-url/v1/models` to see available models
2. Verify the model name matches exactly (case-sensitive)
3. Check that the model is configured in your gateway's `llmsConfig.js`

### Authentication Errors

**Issue:** "Invalid token" or "Unauthorized" errors

**Solutions:**
1. Verify you're using the admin token, not a user token
2. Check that the token matches the `ADMIN_FIRST` environment variable in your gateway
3. Ensure there are no extra spaces or characters in the API key field

### Rate Limiting

**Issue:** "Insufficient balance" or 429 errors

**Solutions:**
1. Check your energy token balance: `GET /token?masterToken=YOUR_TOKEN&userId=YOUR_USER_ID`
2. Top up your balance if needed: `PUT /token` with appropriate parameters
3. Contact your gateway administrator for balance increase

## Advanced Configuration

### Using Different Providers

The API Gateway automatically fails over between providers. The request flow is:

1. Try primary provider (e.g., `gpt-4o_go` for GPT-4o)
2. If fails, try secondary provider (e.g., `gpt-4o` official)
3. Continue through provider chain until success or all fail

You don't need to configure this - it happens automatically.

### Energy Token System

The gateway uses an internal "energy" currency:
- Different models have different energy conversion rates
- Higher efficiency models (like Claude Haiku) cost less energy
- Reasoning models (like o1-preview) cost more energy
- Check `ARCHITECTURE.md` for detailed pricing

### Streaming Support

The API Gateway supports both streaming and non-streaming responses:
- Most models support streaming (real-time response)
- Some models (o1, Claude) are automatically converted to non-streaming internally
- Cursor will automatically handle the appropriate mode

## API Endpoint Reference

The API Gateway implements the following OpenAI-compatible endpoints:

- `GET /v1/models` - List all available models
- `GET /v1/models/{model}` - Get specific model information
- `POST /v1/chat/completions` - Create chat completions (main endpoint)
- `POST /v1/audio/transcriptions` - Audio to text (Whisper)
- `POST /v1/audio/speech` - Text to speech (TTS)

## Support

For issues or questions:

1. Check the [API Gateway documentation](./ARCHITECTURE.md)
2. Review the [README](./README.md) for general setup
3. Open an issue on [GitHub](https://github.com/deep-assistant/api-gateway/issues)
4. Contact the Deep Assistant team

## Security Notes

1. **Keep your API key secure** - Never share it or commit it to version control
2. **Use HTTPS in production** - Always use encrypted connections for remote gateways
3. **Monitor usage** - Regularly check your token balance and usage patterns
4. **Rotate keys** - Periodically regenerate your API tokens for security

## Migration from OpenAI

If you're migrating from OpenAI's API:

1. Your existing Cursor workflows will work the same way
2. Model names may differ slightly (check available models list)
3. You'll get access to more models and providers
4. Energy token system provides better cost management
5. Automatic failover improves reliability

## Example: Complete Setup

Here's a complete example configuration:

```
Settings > Features > Models

✅ OpenAI API Key
   API Key: ••••••••••••••••••••••••••••••••
   (This is your ADMIN_FIRST token from the gateway)

✅ Override OpenAI Base URL (when using key)
   Base URL: https://api.deep-foundation.tech/v1

[Verify] [Save]
```

After saving, you can use any model from the dropdown in Cursor's chat interface.

## What's Next?

- Explore different models to find what works best for your use case
- Monitor your energy token usage
- Check out the [API documentation](./ARCHITECTURE.md) for advanced features
- Consider setting up your own API Gateway instance for more control

---

*This guide is part of the Deep Assistant project. For more information, visit the [master-plan repository](https://github.com/deep-assistant/master-plan).*
