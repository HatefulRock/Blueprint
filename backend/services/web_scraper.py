import httpx
import html
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from langdetect import detect, DetectorFactory
from typing import Optional

# Ensure consistent language detection results
DetectorFactory.seed = 0

# Security constants
MAX_SCRAPED_CONTENT_LENGTH = 500_000  # 500K characters
ALLOWED_URL_SCHEMES = {"http", "https"}
REQUEST_TIMEOUT = 30  # seconds
MIN_TEXT_LENGTH_FOR_DETECTION = 20  # Minimum characters needed for reliable detection
LANGUAGE_CONFIDENCE_THRESHOLD = 0.7  # Not directly used by langdetect, but kept for future use

# Language code mappings (full language name to ISO 639-1 code)
LANGUAGE_CODE_MAP = {
    "chinese": "zh-cn",
    "mandarin": "zh-cn",
    "french": "fr",
    "spanish": "es",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "russian": "ru",
    "japanese": "ja",
    "korean": "ko",
    "arabic": "ar",
    "hindi": "hi",
    "dutch": "nl",
    "polish": "pl",
    "turkish": "tr",
    "vietnamese": "vi",
    "thai": "th",
    "greek": "el",
    "hebrew": "he",
    "swedish": "sv",
    "norwegian": "no",
    "danish": "da",
    "finnish": "fi",
    "czech": "cs",
    "hungarian": "hu",
    "romanian": "ro",
    "indonesian": "id",
    "malay": "ms",
    "tagalog": "tl",
    "ukrainian": "uk",
    "english": "en",
}


class WebScraper:
    @staticmethod
    def _normalize_language_code(language: str) -> str:
        """
        Normalize language name/code to ISO 639-1 format.
        Examples: "Chinese" -> "zh", "zh-cn" -> "zh", "French" -> "fr"
        """
        if not language:
            return ""

        # Convert to lowercase for comparison
        lang_lower = language.lower().strip()

        # Check if it's a full language name
        if lang_lower in LANGUAGE_CODE_MAP:
            code = LANGUAGE_CODE_MAP[lang_lower]
            # Return just the base language code (e.g., "zh" from "zh-cn")
            return code.split("-")[0]

        # If it's already a code (e.g., "zh-cn", "fr"), extract base code
        base_code = lang_lower.split("-")[0]
        return base_code

    @staticmethod
    def _detect_language(text: str) -> Optional[str]:
        """
        Detect the language of a text chunk.
        Returns ISO 639-1 language code (e.g., "fr", "zh") or None if detection fails.
        """
        if not text or len(text) < MIN_TEXT_LENGTH_FOR_DETECTION:
            return None

        try:
            detected = detect(text)
            return detected
        except Exception:
            # Language detection failed
            return None

    @staticmethod
    def _is_target_language(text: str, target_language: str) -> bool:
        """
        Check if a text chunk is in the target language.
        """
        if not target_language:
            return True  # If no target language specified, accept all

        detected = WebScraper._detect_language(text)
        if not detected:
            return False

        # Normalize target language to base code
        target_code = WebScraper._normalize_language_code(target_language)

        # Compare base codes
        return detected == target_code

    @staticmethod
    def _validate_url(url: str) -> None:
        """Validate URL for security."""
        if not url or not isinstance(url, str):
            raise ValueError("Invalid URL: URL must be a non-empty string")

        # Parse URL
        try:
            parsed = urlparse(url)
        except Exception:
            raise ValueError("Invalid URL: Unable to parse URL")

        # Check scheme
        if parsed.scheme.lower() not in ALLOWED_URL_SCHEMES:
            raise ValueError(
                f"Invalid URL scheme: Only {', '.join(ALLOWED_URL_SCHEMES)} are allowed"
            )

        # Check for localhost/private IPs to prevent SSRF
        hostname = parsed.hostname
        if hostname:
            hostname_lower = hostname.lower()
            # Block localhost and private IP ranges
            if hostname_lower in ("localhost", "127.0.0.1", "0.0.0.0", "[::]", "::1"):
                raise ValueError("Invalid URL: Localhost not allowed")
            if hostname_lower.startswith("192.168.") or hostname_lower.startswith("10."):
                raise ValueError("Invalid URL: Private IP ranges not allowed")
            if hostname_lower.startswith("172."):
                # Check 172.16.0.0 - 172.31.255.255
                try:
                    second_octet = int(hostname_lower.split(".")[1])
                    if 16 <= second_octet <= 31:
                        raise ValueError("Invalid URL: Private IP ranges not allowed")
                except (ValueError, IndexError):
                    pass

    @staticmethod
    def _sanitize_text(text: str) -> str:
        """Sanitize extracted text content."""
        if not text:
            return ""

        # Decode HTML entities
        text = html.unescape(text)

        # Remove excessive whitespace
        lines = [line.strip() for line in text.splitlines()]
        text = "\n".join(line for line in lines if line)

        # Enforce length limit
        if len(text) > MAX_SCRAPED_CONTENT_LENGTH:
            text = text[:MAX_SCRAPED_CONTENT_LENGTH]

        return text

    @staticmethod
    def scrape(url: str, target_language: Optional[str] = None):
        """
        Scrape a URL and optionally filter content by target language.

        Args:
            url: The URL to scrape
            target_language: Optional language to filter content (e.g., "Chinese", "French", "zh", "fr")

        Returns:
            Dictionary with 'title' and 'text' keys, or None on failure
        """
        try:
            # Validate URL first
            WebScraper._validate_url(url)

            headers = {"User-Agent": "Mozilla/5.0"}
            response = httpx.get(
                url,
                headers=headers,
                follow_redirects=True,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()

            # Parse with BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove dangerous elements
            for element in soup(["script", "style", "iframe", "object", "embed"]):
                element.decompose()

            # Try to get the title
            title = soup.title.string if soup.title else "Untitled Article"
            # Sanitize title
            title = WebScraper._sanitize_text(title)[:200]  # Limit title length

            # Extract text with language filtering if target language specified
            if target_language:
                # Extract paragraphs and filter by language
                paragraphs = soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'])
                filtered_chunks = []

                for elem in paragraphs:
                    chunk = elem.get_text(strip=True)
                    if chunk and len(chunk) >= MIN_TEXT_LENGTH_FOR_DETECTION:
                        if WebScraper._is_target_language(chunk, target_language):
                            filtered_chunks.append(chunk)

                text = "\n\n".join(filtered_chunks)

                # If we got very little content, fall back to unfiltered extraction
                if not text or len(text) < 100:
                    print(f"Warning: Language filtering resulted in minimal content. Falling back to unfiltered extraction.")
                    paragraphs = soup.find_all('p')
                    text = "\n\n".join([p.get_text() for p in paragraphs])
            else:
                # No language filtering - use original logic
                paragraphs = soup.find_all('p')
                text = "\n\n".join([p.get_text() for p in paragraphs])

            if not text or len(text) < 100:
                # Fallback to body text if no paragraphs found
                text = soup.get_text(separator='\n\n', strip=True)

            # Sanitize the extracted text
            text = WebScraper._sanitize_text(text)

            return {
                "title": title if title else "Untitled Article",
                "text": text
            }
        except ValueError as e:
            # Validation errors
            print(f"URL validation error: {e}")
            return None
        except Exception as e:
            print(f"Scraping error: {e}")
            return None
