"""
Tests for video learning endpoints.

Tests cover:
- Video upload validation
- Video analysis
- Transcript extraction
"""

import pytest
import io
import models  # FIX: Maintain consistency to avoid SQLAlchemy metadata issues
from unittest.mock import patch, MagicMock

class TestVideoUploadValidation:
    """Tests for video upload validation."""

    def test_upload_invalid_extension(self, authenticated_client):
        """Should reject files with invalid extensions."""
        file_content = b"fake video content"
        files = {
            "file": ("test.txt", io.BytesIO(file_content), "text/plain")
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files,
            data={
                "target_language": "Spanish",
                "native_language": "English"
            }
        )

        assert response.status_code == 400
        assert "extension" in response.json()["detail"].lower() or "not allowed" in response.json()["detail"].lower()

    def test_upload_invalid_content_type(self, authenticated_client):
        """Should reject files with invalid content type."""
        file_content = b"fake video content"
        files = {
            "file": ("test.mp4", io.BytesIO(file_content), "text/plain")
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files,
            data={
                "target_language": "Spanish",
                "native_language": "English"
            }
        )

        assert response.status_code == 400

    def test_upload_missing_filename(self, authenticated_client):
        """Should require filename."""
        file_content = b"fake video content"
        # FastAPI/Starlette usually requires a filename in the tuple
        files = {
            "file": ("", io.BytesIO(file_content), "video/mp4")
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files,
            data={"target_language": "Spanish"}
        )

        assert response.status_code == 400

    def test_upload_file_too_large(self, authenticated_client):
        """Should reject files exceeding size limit."""
        # Create a file larger than 50MB (mocking the size check)
        # Note: In some setups, you'd mock the size check rather than allocating 51MB of RAM
        large_content = b"x" * (51 * 1024 * 1024) 
        files = {
            "file": ("test.mp4", io.BytesIO(large_content), "video/mp4")
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files,
            data={"target_language": "Spanish"}
        )

        assert response.status_code == 400
        assert "large" in response.json()["detail"].lower()


class TestVideoAnalysis:
    """Tests for video analysis endpoint."""

    # FIX: Ensure this path matches your project structure (e.g. backend.routers.video)
    @patch("routers.video.video_processor")
    def test_upload_video_success(self, mock_processor, authenticated_client):
        """Should analyze video and return results."""
        mock_processor.analyze_video.return_value = {
            "transcript": [{"time": 0, "text": "Hola"}],
            "vocabulary": [{"word": "hola", "translation": "hello"}],
            "grammar_points": ["greeting"]
        }
        mock_processor.generate_exercises_from_video.return_value = [
            {"type": "fill_blank", "question": "_____ mundo!"}
        ]

        file_content = b"fake mp4 content"
        files = {
            "file": ("test.mp4", io.BytesIO(file_content), "video/mp4")
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files,
            data={
                "target_language": "Spanish",
                "native_language": "English"
            }
        )

        # 200 is success, 500 might happen if mocks aren't fully covering dependencies
        assert response.status_code == 200
        data = response.json()
        assert "transcript" in data or "id" in data

    def test_upload_video_missing_language(self, authenticated_client):
        """Should require target language."""
        file_content = b"fake video content"
        files = {
            "file": ("test.mp4", io.BytesIO(file_content), "video/mp4")
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files
            # Missing target_language in data
        )

        # 422 is standard FastAPI Unprocessable Entity for missing required fields
        assert response.status_code == 422


class TestTranscriptExtraction:
    """Tests for transcript extraction endpoint."""

    @patch("routers.video.video_processor")
    def test_extract_transcript(self, mock_processor, authenticated_client):
        """Should extract transcript from video."""
        mock_processor.extract_audio_transcript.return_value = {
            "segments": [
                {"start": 0.0, "end": 2.0, "text": "Hola"},
                {"start": 2.0, "end": 4.0, "text": "Como estas?"}
            ]
        }

        file_content = b"fake mp4 content"
        files = {
            "file": ("test.mp4", io.BytesIO(file_content), "video/mp4")
        }

        response = authenticated_client.post(
            "/video/transcript",
            files=files,
            data={"target_language": "Spanish"}
        )

        assert response.status_code == 200
        assert "segments" in response.json()

    def test_extract_transcript_invalid_file(self, authenticated_client):
        """Should reject invalid video files."""
        file_content = b"not a video"
        files = {
            "file": ("test.txt", io.BytesIO(file_content), "text/plain")
        }

        response = authenticated_client.post(
            "/video/transcript",
            files=files,
            data={"target_language": "Spanish"}
        )

        assert response.status_code == 400


class TestVideoFileTypes:
    """Tests for supported video file types."""

    @pytest.mark.parametrize("extension,content_type", [
        (".mp4", "video/mp4"),
        (".webm", "video/webm"),
        (".mov", "video/quicktime"), # Standard MIME for .mov
    ])
    def test_accepted_file_types(self, extension, content_type, authenticated_client):
        """Should accept various video formats."""
        file_content = b"fake video content"
        files = {
            "file": (f"test{extension}", io.BytesIO(file_content), content_type)
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files,
            data={"target_language": "Spanish"}
        )

        # Validation should pass (not 400)
        assert response.status_code != 400

    @pytest.mark.parametrize("extension,content_type", [
        (".exe", "application/x-msdownload"),
        (".jpg", "image/jpeg"),
        (".pdf", "application/pdf"),
    ])
    def test_rejected_file_types(self, extension, content_type, authenticated_client):
        """Should reject unsupported non-video formats."""
        file_content = b"fake content"
        files = {
            "file": (f"test{extension}", io.BytesIO(file_content), content_type)
        }

        response = authenticated_client.post(
            "/video/upload",
            files=files,
            data={"target_language": "Spanish"}
        )

        assert response.status_code == 400