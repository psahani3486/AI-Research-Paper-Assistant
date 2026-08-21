import os
import re
import uuid
import pymupdf
from fastapi import UploadFile, HTTPException, status
from pathlib import Path
from typing import List, Dict
from app.config import settings

MAX_FILE_SIZE_MB = 25
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

async def validate_pdf(file: UploadFile):
    """
    Validates uploaded file:
    1. Checks filename extension (.pdf)
    2. Validates magic bytes header (%PDF-)
    3. Checks maximum file size limit (25 MB)
    """
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF documents (.pdf) are allowed."
        )

    header = await file.read(1024)
    await file.seek(0)

    if not header.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid PDF. File signature header does not match %PDF format."
        )

    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    await file.seek(0)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds limit of {MAX_FILE_SIZE_MB} MB."
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

async def save_pdf_file(file: UploadFile) -> tuple[str, str, str, str, int]:
    """
    Saves PDF file to data/uploads directory with a unique UUID.
    Extracts page count and paper title using PyMuPDF.

    Returns:
        (paper_id, paper_title, original_filename, destination_path, page_count)
    """
    await validate_pdf(file)

    paper_id = str(uuid.uuid4())
    original_filename = file.filename or "paper.pdf"
    
    raw_title = Path(original_filename).stem.replace("_", " ").replace("-", " ").title()
    destination_path = os.path.join(settings.UPLOAD_DIR, f"{paper_id}.pdf")

    contents = await file.read()
    with open(destination_path, "wb") as f:
        f.write(contents)

    page_count = 0
    paper_title = raw_title
    try:
        doc = pymupdf.open(destination_path)
        page_count = len(doc)
        meta_title = doc.metadata.get("title", "") if doc.metadata else ""
        if meta_title and len(meta_title.strip()) > 3:
            paper_title = meta_title.strip()
        doc.close()
    except Exception as e:
        print(f"[PDF Service Warning] PyMuPDF page count error: {e}")

    return paper_id, paper_title, original_filename, destination_path, page_count

def delete_pdf_file(file_path: str) -> bool:
    """
    Deletes PDF file from disk safely.
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        print(f"[PDF Service Error] Failed to delete file {file_path}: {e}")
    return False

def clean_academic_text(raw_text: str) -> str:
    """
    Academic Text Cleaner:
    1. Rejoins hyphenated words split across line breaks (e.g. 'transfor-\nmer' -> 'transformer')
    2. Replaces multiple consecutive newlines and spaces with clean spacing
    3. Removes non-printable/control ASCII characters
    4. Strips leading/trailing whitespace per paragraph
    """
    if not raw_text:
        return ""

    # Rule 1: Rejoin hyphenated words across line breaks (transfor-\nmer -> transformer)
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', raw_text)

    # Rule 2: Replace single line breaks inside paragraphs with spaces (preserves double newlines for paragraphs)
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)

    # Rule 3: Replace 3+ consecutive newlines with double newline
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Rule 4: Replaces multiple spaces/tabs with single space
    text = re.sub(r'[ \t]+', ' ', text)

    # Rule 5: Strip weird control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    return text.strip()

def extract_pdf_pages(file_path: str) -> List[Dict]:
    """
    Extracts text page-by-page from PDF file using PyMuPDF (fitz).
    Applies text cleaning and returns structured page dictionaries.

    Returns:
        [
          {
            "page_number": 1,
            "raw_text_length": 1500,
            "cleaned_text_length": 1420,
            "word_count": 230,
            "text": "..."
          },
          ...
        ]
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at path: {file_path}")

    pages_data = []
    doc = pymupdf.open(file_path)

    for i, page in enumerate(doc):
        page_num = i + 1
        raw_page_text = page.get_text("text") or ""
        cleaned_text = clean_academic_text(raw_page_text)
        
        words = cleaned_text.split()

        pages_data.append({
            "page_number": page_num,
            "raw_text_length": len(raw_page_text),
            "cleaned_text_length": len(cleaned_text),
            "word_count": len(words),
            "text": cleaned_text
        })

    doc.close()
    return pages_data
