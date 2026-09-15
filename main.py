import os
import tempfile
import io
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
)


# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Put it in backend/.env"
    )

# Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)


# FastAPI app
app = FastAPI(title="Scribe API")


# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Supported files
ALLOWED_AUDIO = {
    ".mp3",
    ".wav",
    ".m4a",
    ".mp4",
    ".mpeg",
    ".mpga",
    ".webm",
}

ALLOWED_IMAGES = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


# SCRIBE prompt
NOTE_PROMPT = """
You are SCRIBE, an AI-powered lecture reconstruction assistant.

Your job is to transform a classroom lecture into clear, structured,
exam-friendly study material.

You may receive:
1. A lecture audio recording.
2. A classroom whiteboard or slide image.
3. Both audio and image.

Analyze ALL provided information together.

IMPORTANT:
The audio contains the lecturer's explanation.
The image contains information written or displayed during the lecture.
Combine both sources instead of treating them separately.

Create the following sections in EXACTLY this order:

# Lecture Overview

Give a short 2-4 sentence explanation of what the lecture is about.

# Smart Notes

Create detailed but easy-to-revise notes.

Use meaningful headings and subheadings.

Use:
- concise bullet points
- numbered steps when appropriate
- **bold important terms**
- formulas where relevant
- examples mentioned by the lecturer
- relationships between concepts

Preserve:
- definitions
- formulas
- numbers
- algorithms
- important terminology
- examples
- cause-and-effect relationships

# Key Concepts

List the most important concepts from the lecture.

For each concept:
- Give the concept name.
- Explain it briefly and clearly.

# Important Definitions

List important definitions from the lecture.

Format:

**Term:** Simple definition.

# Exam Focus

Identify information that is especially useful for exams.

Include:
- important concepts
- formulas
- algorithms
- comparisons
- likely theory points
- important steps or procedures

Do NOT invent exam questions that were not supported by the lecture.

# Key Takeaways

Give 3-6 of the most important revision points.

RULES:

- Do not invent facts.
- Do not add information unrelated to the lecture.
- Remove filler words and unnecessary repetition.
- Make the notes useful for exam revision.
- Explain difficult concepts clearly.
- If something in the image is unclear, write "[unclear in image]".
- If audio and image contain conflicting information, prioritize the actual
  lecture content and clearly indicate uncertainty.
- Keep the information accurate.

Return ONLY Markdown.
"""

@app.post("/generate-questions")
async def generate_questions(data: dict):

    notes = data.get("notes")

    if not notes:
        raise HTTPException(
            status_code=400,
            detail="No notes were provided."
        )

    try:
        prompt = f"""
You are SCRIBE's Question Generator.

Create study questions from the following lecture notes.

Generate:
- 5 conceptual questions
- 3 short-answer questions
- 2 exam-style questions

Rules:
- Use ONLY information present in the notes.
- Do not invent facts or topics.
- Do not provide answers.
- Avoid duplicate questions.
- Cover different parts of the lecture.
- Make the questions clear and suitable for a college student.
- Include formulas, definitions, algorithms, comparisons, or important concepts
  when they are present in the notes.

Format the result exactly as:

# Conceptual Questions

1. Question
2. Question
3. Question
4. Question
5. Question

# Short-Answer Questions

1. Question
2. Question
3. Question

# Exam-Style Questions

1. Question
2. Question

Lecture Notes:

{notes}

Return ONLY Markdown.
"""

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[prompt]
        )

        return {
            "questions": response.text
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate questions: {str(exc)}"
        ) from exc

def generate_notes(audio_path=None, image_path=None):
    contents = [NOTE_PROMPT]

    # Upload audio to Gemini
    if audio_path:
        audio_file = client.files.upload(file=audio_path)
        contents.append(audio_file)

    # Upload image to Gemini
    if image_path:
        image_file = client.files.upload(file=image_path)
        contents.append(image_file)

    # Generate notes
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=contents,
    )

    return response.text


@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/download-pdf")
async def download_pdf(data: dict):

    notes = data.get("notes")

    if not notes:
        raise HTTPException(
            status_code=400,
            detail="No notes were provided."
        )

    try:
        pdf_buffer = io.BytesIO()

        document = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=45,
            leftMargin=45,
            topMargin=45,
            bottomMargin=45
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "ScribeTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontSize=24,
            spaceAfter=20
        )

        heading_style = ParagraphStyle(
            "ScribeHeading",
            parent=styles["Heading1"],
            fontSize=18,
            spaceBefore=18,
            spaceAfter=10
        )

        body_style = ParagraphStyle(
            "ScribeBody",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=16,
            spaceAfter=7
        )

        story = []

        story.append(
            Paragraph(
                "SCRIBE",
                title_style
            )
        )

        story.append(
            Paragraph(
                "AI Lecture Notes",
                styles["Heading2"]
            )
        )

        story.append(Spacer(1, 20))

        # Convert Markdown-style notes into PDF paragraphs
        for line in notes.splitlines():

            line = line.strip()

            if not line:
                story.append(Spacer(1, 6))
                continue

            if line.startswith("# "):
                heading = line[2:].strip()

                story.append(
                    Paragraph(
                        heading,
                        heading_style
                    )
                )

            elif line.startswith("## "):
                heading = line[3:].strip()

                story.append(
                    Paragraph(
                        heading,
                        styles["Heading2"]
                    )
                )

            elif line.startswith("### "):
                heading = line[4:].strip()

                story.append(
                    Paragraph(
                        heading,
                        styles["Heading3"]
                    )
                )

            elif line.startswith("- "):
                text = line[2:].strip()

                story.append(
                    Paragraph(
                        "• " + text,
                        body_style
                    )
                )

            else:
                story.append(
                    Paragraph(
                        line,
                        body_style
                    )
                )

        document.build(story)

        pdf_buffer.seek(0)

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    "attachment; filename=SCRIBE-Lecture-Notes.pdf"
            }
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Could not create PDF: {str(exc)}"
        ) from exc
        
@app.post("/simplify-notes")
async def simplify_notes(data: dict):
    notes = data.get("notes")

    if not notes:
        raise HTTPException(
            status_code=400,
            detail="No notes were provided."
        )

    try:
        prompt = f"""
You are SCRIBE's Easy Notes assistant.

Rewrite the following lecture notes so that a beginner student
can understand them easily.

Rules:
- Keep all important facts.
- Keep formulas, algorithms, definitions, numbers, and examples.
- Do not remove important exam information.
- Replace difficult wording with simple language.
- Explain technical terms briefly when necessary.
- Use short sentences.
- Use bullet points where helpful.
- Do not add facts that are not present in the original notes.
- Keep the same overall meaning.
- Make the result easy to revise before an exam.

Original lecture notes:

{notes}

Return ONLY Markdown.
"""

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[prompt]
        )

        return {
            "notes": response.text
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not simplify notes: {str(exc)}"
        ) from exc    


@app.post("/generate-notes")
async def generate_lecture_notes(
    audio: UploadFile = File(None),
    image: UploadFile = File(None),
):

    if not audio and not image:
        raise HTTPException(
            status_code=400,
            detail="Please upload audio or an image."
        )

    audio_path = None
    image_path = None

    try:

        # -------------------------
        # SAVE AUDIO
        # -------------------------
        if audio:

            audio_suffix = Path(
                audio.filename or ""
            ).suffix.lower()

            if audio_suffix not in ALLOWED_AUDIO:

                content_type = audio.content_type or ""

                if content_type.startswith("audio/"):
                    audio_suffix = ".wav"
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Unsupported audio format."
                    )

            audio_bytes = await audio.read()

            if not audio_bytes:
                raise HTTPException(
                    status_code=400,
                    detail="Audio file is empty."
                )

            with tempfile.NamedTemporaryFile(
                suffix=audio_suffix,
                delete=False
            ) as temp_audio:

                temp_audio.write(audio_bytes)
                audio_path = temp_audio.name


        # -------------------------
        # SAVE IMAGE
        # -------------------------
        if image:

            image_suffix = Path(
                image.filename or ""
            ).suffix.lower()

            if image_suffix not in ALLOWED_IMAGES:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported image format."
                )

            image_bytes = await image.read()

            if not image_bytes:
                raise HTTPException(
                    status_code=400,
                    detail="Image file is empty."
                )

            with tempfile.NamedTemporaryFile(
                suffix=image_suffix,
                delete=False
            ) as temp_image:

                temp_image.write(image_bytes)
                image_path = temp_image.name


        # -------------------------
        # GENERATE SCRIBE NOTES
        # -------------------------
        notes = generate_notes(
            audio_path=audio_path,
            image_path=image_path
        )


        return {
            "notes": notes
        }


    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Scribe failed: {str(exc)}"
        ) from exc


    finally:

        # Delete temporary files
        if audio_path:
            try:
                os.remove(audio_path)
            except OSError:
                pass

        if image_path:
            try:
                os.remove(image_path)
            except OSError:
                pass