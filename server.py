import httpx
from mcp.server import FastMCP
import os, logging

mcp = FastMCP("Chatbot")

logging.basicConfig(level=logging.INFO)

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
WHATSAPP_API_BASE = "https://graph.facebook.com/v21.0"

async def send_report(body):
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        logging.error(
            "WhatsApp credentials are not set. "
            "Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in the environment."
        )
        # Fail fast on tool call, but do NOT crash the MCP server itself.
        raise RuntimeError("WhatsApp credentials not configured")

    url = f"{WHATSAPP_API_BASE}/{WHATSAPP_PHONE_ID}/messages"
    to = "owner"
    headers  = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body},
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()




@mcp.tool()
async def notify_user(user_phone, message):
    logging.info("Sending WhatsApp message to %s", user_phone)
    return await send_report(body=message)


if __name__ == "__main__":
    mcp.run()