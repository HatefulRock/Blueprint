from typing import Optional
from pypdf import PdfReader


class FileParser:
    @staticmethod
    def extract_text_from_pdf(path: str) -> Optional[str]:
        try:
            reader = PdfReader(path)
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            return "\n\n".join(text_parts).strip()
        except Exception as e:
            print(f"PDF parse error: {e}")
            return None

    @staticmethod
    def extract_title_from_text(text: str) -> str:
        # Heuristic: first non-empty line under 120 chars
        for line in text.splitlines():
            l = line.strip()
            if l:
                return l if len(l) <= 120 else l[:120]
        return "Untitled"
