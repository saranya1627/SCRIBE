let processingTimer;
const audioInput = document.getElementById("audioInput");
const imageInput = document.getElementById("imageInput");
const generateBtn = document.getElementById("generateBtn");
const resultSection = document.getElementById("resultSection");


// ===============================
// FILE SELECTION
// ===============================

audioInput.addEventListener("change", () => {
    if (audioInput.files.length > 0) {
        document.querySelector(".audio-icon").textContent = "✓";
    }
});

imageInput.addEventListener("change", () => {
    if (imageInput.files.length > 0) {
        document.querySelector(".image-icon").textContent = "✓";
    }
});


// ===============================
// GENERATE NOTES
// ===============================

generateBtn.addEventListener("click", async () => {

    if (!audioInput.files.length && !imageInput.files.length) {
        alert("Please upload a lecture audio or slide image first.");
        return;
    }

    generateBtn.textContent = "🎙️ Analyzing lecture audio...";
    generateBtn.disabled = true;

    const formData = new FormData();

    if (audioInput.files.length) {
        formData.append("audio", audioInput.files[0]);
    }

    if (imageInput.files.length) {
        formData.append("image", imageInput.files[0]);
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/generate-notes",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Something went wrong."
            );
        }

        showNotes(data.notes);

        generateBtn.textContent = "✓ Notes Generated";

        resultSection.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {

        console.error(error);

        alert(
            "SCRIBE could not generate the notes.\n\n" +
            error.message
        );

        generateBtn.textContent =
            "✦ Generate Smart Notes";

    } finally {

        generateBtn.disabled = false;
    }
});


// ===============================
// DISPLAY NOTES
// ===============================

function showNotes(markdown) {

    window.currentNotes = markdown;

    resultSection.style.display = "block";

    resultSection.innerHTML = `

        <div class="result-card">

            <div class="result-header">

                <div>
                    <span class="result-badge">
                        ✦ AI GENERATED
                    </span>

                    <h2>✨ Your Smart Notes</h2>

                    <p class="result-subtitle">
                        Reconstructed from your lecture
                    </p>
                </div>

                <div class="result-actions">
                    
                    <button
                        id="easyNotesBtn"
                        class="secondary-btn"
                    >
                        📝 Easy Notes
                    </button>

                    <button
                        id="downloadBtn"
                        class="secondary-btn"
                    >
                        ⬇ Download
                    </button>

                    <button
                        id="refreshBtn"
                        class="secondary-btn"
                    >
                        ↻ New Lecture
                    </button>

                </div>

            </div>

            <div class="intelligence-strip">
    <div class="intelligence-item">
        <span class="intelligence-icon">🧠</span>
        <div>
            <strong>AI Reconstructed</strong>
            <small>Lecture analyzed</small>
        </div>
    </div>

    <div class="intelligence-item">
        <span class="intelligence-icon">📚</span>
        <div>
            <strong>6 Sections</strong>
            <small>Study structure</small>
        </div>
    </div>

    <div class="intelligence-item">
        <span class="intelligence-icon">🎯</span>
        <div>
            <strong>Exam Ready</strong>
            <small>Focus points included</small>
        </div>
    </div>

    <div class="intelligence-item">
        <span class="intelligence-icon">⚡</span>
        <div>
            <strong>Quick Revision</strong>
            <small>Key takeaways included</small>
        </div>
    </div>
</div>
            <div class="search-box">

                <span>🔍</span>

                <input
                    type="text"
                    id="noteSearch"
                    placeholder="Search your notes..."
                >

            </div>


            <div
                id="notesContent"
                class="notes-content"
            >
                ${formatMarkdown(markdown)}
            </div>

        </div>
    `;


    // Search
    document
        .getElementById("noteSearch")
        .addEventListener("input", searchNotes);

    document
    .getElementById("easyNotesBtn")
    .addEventListener("click", generateEasyNotes);    


    // Download
    document
        .getElementById("downloadBtn")
        .addEventListener("click", () => {
            downloadNotes(markdown);
        });


    // Refresh
    document
        .getElementById("refreshBtn")
        .addEventListener("click", resetScribe);
}


// ===============================
// MARKDOWN → HTML
// ===============================

function formatMarkdown(markdown) {

    let html = escapeHtml(markdown);

    // Headings
    html = html.replace(
        /^### (.*$)/gim,
        '<h4>$1</h4>'
    );

    html = html.replace(
        /^## (.*$)/gim,
        '<h3>$1</h3>'
    );

    html = html.replace(
        /^# (.*$)/gim,
        '<h2>$1</h2>'
    );

    // Bold
    html = html.replace(
        /\*\*(.*?)\*\*/g,
        '<strong>$1</strong>'
    );

    // Bullet points
    html = html.replace(
        /^\s*[-•] (.*)$/gim,
        '<li>$1</li>'
    );

    // Numbered lists
    html = html.replace(
        /^\s*(\d+)\. (.*)$/gim,
        '<li class="numbered-item">$2</li>'
    );

    // Horizontal separators
    html = html.replace(
        /^---$/gim,
        '<hr>'
    );

    // New lines
    html = html.replace(
        /\n/g,
        "<br>"
    );

    return html;
}function formatMarkdown(markdown) {

    let html = escapeHtml(markdown);

    // Convert main sections into styled section blocks
    html = html.replace(
        /^# Lecture Overview\s*([\s\S]*?)(?=^# |\s*$)/gim,
        `
        <section class="note-section overview-section">
            <div class="section-icon">🧠</div>
            <div>
                <h2>Lecture Overview</h2>
                <div class="section-body">$1</div>
            </div>
        </section>
        `
    );

    html = html.replace(
        /^# Smart Notes\s*([\s\S]*?)(?=^# |\s*$)/gim,
        `
        <section class="note-section">
            <div class="section-icon">📚</div>
            <div>
                <h2>Smart Notes</h2>
                <div class="section-body">$1</div>
            </div>
        </section>
        `
    );

    html = html.replace(
        /^# Key Concepts\s*([\s\S]*?)(?=^# |\s*$)/gim,
        `
        <section class="note-section">
            <div class="section-icon">💡</div>
            <div>
                <h2>Key Concepts</h2>
                <div class="section-body">$1</div>
            </div>
        </section>
        `
    );

    html = html.replace(
        /^# Important Definitions\s*([\s\S]*?)(?=^# |\s*$)/gim,
        `
        <section class="note-section">
            <div class="section-icon">📖</div>
            <div>
                <h2>Important Definitions</h2>
                <div class="section-body">$1</div>
            </div>
        </section>
        `
    );

    html = html.replace(
        /^# Exam Focus\s*([\s\S]*?)(?=^# |\s*$)/gim,
        `
        <section class="note-section exam-section">
            <div class="section-icon">🎯</div>
            <div>
                <h2>Exam Focus</h2>
                <div class="section-body">$1</div>
            </div>
        </section>
        `
    );

    html = html.replace(
        /^# Key Takeaways\s*([\s\S]*?)$/gim,
        `
        <section class="note-section takeaway-section">
            <div class="section-icon">✅</div>
            <div>
                <h2>Key Takeaways</h2>
                <div class="section-body">$1</div>
            </div>
        </section>
        `
    );

    // Subheadings
    html = html.replace(
        /^### (.*$)/gim,
        "<h4>$1</h4>"
    );

    html = html.replace(
        /^## (.*$)/gim,
        "<h3>$1</h3>"
    );

    // Bold text
    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    // Bullet points
    html = html.replace(
        /^\s*[-•] (.*)$/gim,
        "<li>$1</li>"
    );

    // Numbered points
    html = html.replace(
        /^\s*(\d+)\. (.*)$/gim,
        '<li class="numbered-item">$2</li>'
    );

    // Horizontal lines
    html = html.replace(
        /^---$/gim,
        "<hr>"
    );

    // New lines
    html = html.replace(
        /\n/g,
        "<br>"
    );

    return html;
}


// ===============================
// SEARCH NOTES
// ===============================

function searchNotes() {

    const searchInput =
        document.getElementById("noteSearch");

    const query =
        searchInput.value.toLowerCase().trim();

    const notes =
        document.getElementById("notesContent");

    // If search box is empty, show the original notes
    if (!query) {
        notes.innerHTML =
            formatMarkdown(window.currentNotes);
        return;
    }

    // Search inside the original notes
    const originalText =
        window.currentNotes.toLowerCase();

    if (!originalText.includes(query)) {

        notes.innerHTML = `
            <div class="no-results">
                🔍
                <h3>No matching information</h3>
                <p>
                    Try searching for another concept,
                    definition, formula, or topic.
                </p>
            </div>
        `;

        return;
    }

    // Create the normal formatted notes
    let formatted =
        formatMarkdown(window.currentNotes);

    // Highlight matching words
    const escapedQuery =
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const highlightRegex =
        new RegExp(`(${escapedQuery})`, "gi");

    formatted =
        formatted.replace(
            highlightRegex,
            '<mark class="search-highlight">$1</mark>'
        );

    notes.innerHTML = formatted;

    // Scroll to the first match
    const firstMatch =
        notes.querySelector(".search-highlight");

    if (firstMatch) {
        firstMatch.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


// ===============================
// DOWNLOAD
// ===============================

async function downloadNotes(markdown) {

    const downloadBtn =
        document.getElementById("downloadBtn");

    downloadBtn.textContent =
        "⏳ Creating PDF...";

    downloadBtn.disabled = true;

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/download-pdf",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    notes: markdown
                })
            }
        );

        if (!response.ok) {

            const errorData =
                await response.json();

            throw new Error(
                errorData.detail ||
                "Could not create PDF."
            );
        }

        const pdfBlob =
            await response.blob();

        const url =
            URL.createObjectURL(pdfBlob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "SCRIBE-Lecture-Notes.pdf";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        downloadBtn.textContent =
            "✓ PDF Downloaded";

    } catch (error) {

        console.error(error);

        alert(
            "SCRIBE could not create the PDF.\n\n" +
            error.message
        );

        downloadBtn.textContent =
            "⬇ Download";

    } finally {

        downloadBtn.disabled = false;

    }
}


// ===============================
// RESET / NEW LECTURE
// ===============================

function resetScribe() {

    resultSection.innerHTML = "";

    resultSection.style.display = "none";

    audioInput.value = "";
    imageInput.value = "";

    const audioIcon =
        document.querySelector(".audio-icon");

    const imageIcon =
        document.querySelector(".image-icon");

    if (audioIcon) {
        audioIcon.textContent = "🎙️";
    }

    if (imageIcon) {
        imageIcon.textContent = "🖼️";
    }

    generateBtn.textContent =
        "✦ Generate Smart Notes";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ===============================
// SECURITY
// ===============================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

async function generateEasyNotes() {

    const easyNotesBtn =
        document.getElementById("easyNotesBtn");

    const notesContent =
        document.getElementById("notesContent");

    if (!window.currentNotes) {
        return;
    }

    easyNotesBtn.textContent =
        "✨ Simplifying...";

    easyNotesBtn.disabled = true;

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/simplify-notes",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    notes: window.currentNotes
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Could not simplify the notes."
            );
        }

        window.currentNotes = data.notes;

        notesContent.innerHTML =
            formatMarkdown(data.notes);

        easyNotesBtn.textContent =
            "✓ Easy Notes";

    } catch (error) {

        console.error(error);

        alert(
            "SCRIBE could not create Easy Notes.\n\n" +
            error.message
        );

        easyNotesBtn.textContent =
            "✨ Easy Notes";

    } finally {

        easyNotesBtn.disabled = false;

    }
}

