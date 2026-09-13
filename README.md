# Scribe

Scribe turns a lecture recording + whiteboard/slide photo into structured Markdown notes.

## Architecture

Browser
  -> FastAPI
      -> OpenAI speech-to-text
      -> OpenAI vision + LLM
  -> Markdown notes
  -> Browser

## 1. Requirements

- Python 3.10+
- An OpenAI API key
- A browser

## 2. Install backend

Open a terminal:

```bash
cd scribe/backend

python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### macOS/Linux

```bash
source .venv/bin/activate
```

Then:

```bash
pip install -r requirements.txt
```

## 3. Add your API key

Copy:

```text
.env.example
```

to:

```text
.env
```

Then put your key inside:

```text
OPENAI_API_KEY=your_key_here
```

Never put your API key in frontend JavaScript.

## 4. Start the backend

From `scribe/backend`:

```bash
uvicorn main:app --reload
```

You should see the API running at:

```text
http://127.0.0.1:8000
```

Test it in your browser:

```text
http://127.0.0.1:8000/health
```

You should get:

```json
{"status":"ok"}
```

## 5. Start the frontend

Open another terminal.

From the `scribe/frontend` directory:

```bash
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

## 6. Test

Prepare:

1. A short MP3/WAV/M4A lecture recording.
2. A JPG/PNG/WEBP photo of a whiteboard or slide.

Upload both and click **Generate Notes**.

## Hackathon advice

Start with a 30–60 second audio file. Once the complete pipeline works, test longer recordings.

Do not add authentication, a database, live recording, or real-time transcription until the core demo is stable.

## Important

The backend returns the raw transcript as well as the generated notes. For a public deployment, add authentication, file-size limits, request limits, logging, and stronger error handling before exposing the API.
