import os
from aiohttp import web
import server

logging_enabled = True

def log(msg):
    if not logging_enabled:
        return

    try:
        home = os.environ.get('HOME') or os.environ.get('USERPROFILE') or os.path.expanduser('~')
        log_file = os.path.join(home, 'pylog.txt')
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(msg + '\n')
    except Exception as e:
        print(f"Logging failed: {e}")

# HTTP endpoint for logging from JS
@server.PromptServer.instance.routes.post("/pylog")
async def pylog_endpoint(request):
    try:
        data = await request.json()
        msg = data.get('msg', '')
        log(f"[JS] {msg}")
        return web.json_response({"success": True})
    except Exception as e:
        log(f"[JS] Logging error: {e}")
        return web.json_response({"success": False, "error": str(e)})
