import httpx
from bs4 import BeautifulSoup

class WebScraper:
    @staticmethod
    def scrape(url: str):
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            response = httpx.get(url, headers=headers, follow_redirects=True)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove scripts and styles
            for script_or_style in soup(["script", "style"]):
                script_or_style.decompose()

            # Try to get the title
            title = soup.title.string if soup.title else "Untitled Article"

            # Basic text extraction (focus on paragraphs)
            paragraphs = soup.find_all('p')
            text = "\n\n".join([p.get_text() for p in paragraphs])

            if not text or len(text) < 100:
                # Fallback to body text if no paragraphs found
                text = soup.get_text(separator='\n\n', strip=True)

            return {
                "title": title,
                "text": text
            }
        except Exception as e:
            print(f"Scraping error: {e}")
            return None
