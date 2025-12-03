import uuid, logging, json, time
from flask import Flask, request, jsonify, send_from_directory
import asyncio
import os
from pathlib import Path
from utils import MCPClient, GraphRAG,ChatAgent,Preprocess
from werkzeug.utils import secure_filename

logger = logging.getLogger("chatbot")
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter(("%(message)s")))
logger.addHandler(handler)
logger.setLevel(logging.INFO)


BASE_DIR = Path(__file__).parent.resolve()
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
UPLOADS = BASE_DIR / "uploads"
UPLOADS.mkdir(exist_ok = True)


##App initialize
app = Flask(__name__)

async def init():
    global agent , preprocess


    mcp_client = MCPClient()

    server = str(BASE_DIR / "server.py") ##add the path
    await mcp_client.connect_to_server(server)

    rag = GraphRAG()
    agent = ChatAgent(mcp_client=mcp_client,rag=rag)
    preprocess = Preprocess()





@app.route("/chat", methods = ["POST"])
def chat():
    data = request.get_json(force=True) or {}
    user_id = data.get("user_id","anonymous")
    message = data.get("message", "")
    

    request_id = str(uuid.uuid4())
    t0 = time.time()

    risk_service = preprocess
    risky_input = risk_service.classify_prompt_risk(message)
    if not risky_input["allowed"]:
        app.logger.warning(
            "Blocked user message for user %s: heuristic=%s harmful=%s cats=%s",
            user_id,
            risky_input["heuristic_flag"],
            risky_input["harmful_flag"],
            risky_input["categories"],
        )

        return jsonify({
            "answer": "I can’t follow those instructions, but I can still help with normal questions.",
            "interview_state": None,
            "tool_calls": [],
            "flagged": True,
            "reason": "input_blocked",
            "risk": risky_input,
        })
    

    async def _run():

        return  await agent.handle_message(
            user_id = user_id,
            message = message,
            
        )

    
    result= asyncio.run(_run())
    
    latency_ms = int((time.time() - t0) * 1000)
    output_risk = risk_service.classify_prompt_risk(result.get("answer", ""))
    if not output_risk["allowed"]:
        app.logger.warning(
            "Blocked output for user %s: heuristic=%s harmful=%s cats=%s",
            user_id,
            output_risk["heuristic_flag"],
            output_risk["harmful_flag"],
            output_risk["categories"],
        )
        result["answer"] = (
            "I'm not able to provide that response. Please try asking in a different way."
        )
        result["flagged"] = True
        result["reason"] = "output_blocked"
        result["risk"] = output_risk

    ##Logger json for the event happened with a specific id
    logger.info(json.dumps({
            "type": "request",
            "endpoint": "/chat",
            "request_id": request_id,
            "user_id": user_id,
            "latency_ms": latency_ms,
            "status": "ok",
            "graph_used": bool(result.get("interview_state")),  # or other flag
            "tool_calls": result.get("tool_calls", []),
        }))

    return jsonify(result)


@app.route("/voice", methods=["POST"])
def voice_chat():
    """
    Receives an audio file (blob) from the frontend.
    Transcribes it using OpenAI Whisper.
    Passes text + audio metrics to the ChatAgent.
    """
    request_id = str(uuid.uuid4())
    t0 = time.time()
    
    user_id = request.form.get("user_id", "anonymous")
    
    if "audio" not in request.files:
        return jsonify({"error": "no audio part"}), 400
        
    audio_file = request.files["audio"]
    if audio_file.filename == "":
        return jsonify({"error": "empty filename"}), 400

    # Save temp file
    filename = f"{uuid.uuid4()}.webm" # assume webm from browser or wav
    save_path = UPLOADS / filename
    audio_file.save(save_path)

    # 1. Transcribe
    transcription_result = agent.transcriber.transcribe(str(save_path))
    text = transcription_result.get("text", "")
    metrics = transcription_result.get("metadata", {})
    
    # Clean up temp file
    try:
        os.remove(save_path)
    except OSError:
        pass

    if not text:
        return jsonify({"answer": "I couldn't hear you clearly. Could you repeat that?", "tool_calls": []})

    # 2. Process with Agent (passing audio metrics)
    async def _run():
        return await agent.handle_message(
            user_id=user_id,
            message=text,
            audio_metrics=metrics # Pass WPM etc.
        )

    result = asyncio.run(_run())
    result["transcription"] = text # send back what we heard
    
    latency_ms = int((time.time() - t0) * 1000)
    logger.info(json.dumps({
        "type": "voice_request",
        "endpoint": "/voice",
        "user_id": user_id,
        "latency_ms": latency_ms,
        "wpm": metrics.get("wpm", 0)
    }))

    return jsonify(result)


@app.route("/upload", methods=["POST"])
def upload():
    request_id = str(uuid.uuid4())
    t0 = time.time()
    if "file" not in request.files:
        logger.info(json.dumps({
            "type": "request",
            "endpoint": "/upload",
            "request_id": request_id,
            "status": "error",
            "error": "no_file_part",
        }))
        return jsonify({"error": "no file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        logger.info(json.dumps({
            "type": "request",
            "endpoint": "/upload",
            "request_id": request_id,
            "status": "error",
            "error": "empty_filename",
        }))
        return jsonify({"error":"no filename found"}), 400
    
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    save_path = UPLOADS / filename
    file.save(save_path)

    

    index_path = save_path
    if ext == ".pdf":
        txt_path = save_path.with_name(f"{save_path.name}.txt")
        preprocess.extract_pdf(str(save_path), str(txt_path))
        index_path = txt_path
    elif ext in (".docx", ".doc"):
        txt_path = save_path.with_name(f"{save_path.name}.txt")
        preprocess.extract_docx_to_text(str(save_path), str(txt_path))
        index_path = txt_path


    async def _run():
        await agent.rag.index_document(index_path)

    
    asyncio.run(_run())

    return jsonify({"status":"ok","indexed_path": str(index_path)})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if not FRONTEND_DIST.exists():
        return (
            "Frontend build missing. Run `npm run build` inside `frontend/` first.",
            404,
        )

    target = FRONTEND_DIST / path
    if path and target.exists() and target.is_file():
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")


asyncio.run(init())



if __name__ == "__main__":
    app.run(debug=True)




