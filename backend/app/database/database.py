import sqlite3
import json
from typing import List, Dict, Optional
from app.config import settings

def get_db_connection():
    """
    Creates and returns a SQLite connection with row_factory set to sqlite3.Row.
    """
    conn = sqlite3.connect(settings.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes SQLite database tables for paper metadata, chat history, summaries, and domain categories.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create papers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        pages INTEGER DEFAULT 0,
        chunks_count INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'uploaded',
        category TEXT DEFAULT 'General'
    )
    """)

    # Migration check for category column
    try:
        cursor.execute("ALTER TABLE papers ADD COLUMN category TEXT DEFAULT 'General'")
    except Exception:
        pass

    # Create chat_messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper_id TEXT NOT NULL,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        sources_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paper_id) REFERENCES papers (id) ON DELETE CASCADE
    )
    """)

    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN sources_json TEXT")
    except Exception:
        pass

    # Create paper_summaries table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS paper_summaries (
        paper_id TEXT PRIMARY KEY,
        abstract_summary TEXT NOT NULL,
        problem TEXT NOT NULL,
        methodology TEXT NOT NULL,
        dataset TEXT NOT NULL,
        results TEXT NOT NULL,
        limitations TEXT NOT NULL,
        future_work TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paper_id) REFERENCES papers (id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()

# Paper CRUD helpers

def insert_paper(paper_id: str, title: str, filename: str, file_path: str, pages: int, category: str = "General") -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO papers (id, title, filename, file_path, pages, chunks_count, status, category)
    VALUES (?, ?, ?, ?, ?, 0, 'uploaded', ?)
    """, (paper_id, title, filename, file_path, pages, category))

    conn.commit()
    
    cursor.execute("SELECT * FROM papers WHERE id = ?", (paper_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

def get_all_papers_from_db(category: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if category and category.lower() != "all":
        cursor.execute("SELECT * FROM papers WHERE LOWER(category) = LOWER(?) ORDER BY uploaded_at DESC", (category,))
    else:
        cursor.execute("SELECT * FROM papers ORDER BY uploaded_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_paper_by_id_from_db(paper_id: str) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM papers WHERE id = ?", (paper_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_paper_category(paper_id: str, category: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE papers SET category = ? WHERE id = ?", (category, paper_id))
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated

def update_paper_chunks_count(paper_id: str, chunks_count: int, status: str = "processed") -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE papers 
    SET chunks_count = ?, status = ?
    WHERE id = ?
    """, (chunks_count, status, paper_id))
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated

def delete_paper_from_db(paper_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM papers WHERE id = ?", (paper_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

# Chat Memory CRUD Helpers

def insert_chat_message(
    paper_id: str, 
    role: str, 
    message: str, 
    sources_list: Optional[List[Dict]] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()

    sources_json = json.dumps(sources_list) if sources_list else None

    cursor.execute("""
    INSERT INTO chat_messages (paper_id, role, message, sources_json)
    VALUES (?, ?, ?, ?)
    """, (paper_id, role, message, sources_json))

    conn.commit()
    msg_id = cursor.lastrowid

    cursor.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,))
    row = cursor.fetchone()
    conn.close()

    res = dict(row) if row else {}
    if res.get("sources_json"):
        try:
            res["sources"] = json.loads(res["sources_json"])
        except Exception:
            res["sources"] = []
    else:
        res["sources"] = []
    return res

def get_chat_messages_by_paper_id(paper_id: str, limit: int = 50) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM chat_messages 
    WHERE paper_id = ? 
    ORDER BY id ASC 
    LIMIT ?
    """, (paper_id, limit))
    rows = cursor.fetchall()
    conn.close()

    messages = []
    for row in rows:
        item = dict(row)
        if item.get("sources_json"):
            try:
                item["sources"] = json.loads(item["sources_json"])
            except Exception:
                item["sources"] = []
        else:
            item["sources"] = []
        messages.append(item)

    return messages

def clear_chat_history_from_db(paper_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_messages WHERE paper_id = ?", (paper_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

# Paper Summaries CRUD Helpers

def insert_or_update_summary(paper_id: str, summary_dict: Dict) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR REPLACE INTO paper_summaries 
    (paper_id, abstract_summary, problem, methodology, dataset, results, limitations, future_work)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        paper_id,
        summary_dict.get("abstract_summary", ""),
        summary_dict.get("problem", ""),
        summary_dict.get("methodology", ""),
        summary_dict.get("dataset", ""),
        summary_dict.get("results", ""),
        summary_dict.get("limitations", ""),
        summary_dict.get("future_work", "")
    ))

    conn.commit()

    cursor.execute("SELECT * FROM paper_summaries WHERE paper_id = ?", (paper_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

def get_summary_by_paper_id(paper_id: str) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM paper_summaries WHERE paper_id = ?", (paper_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None
