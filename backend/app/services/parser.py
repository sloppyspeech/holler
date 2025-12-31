"""Parser service for extracting metadata and content from Markdown files."""

import re
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from .logger import get_logger

# Initialize logger
logger = get_logger("parser")


@dataclass
class FileMetadata:
    """Parsed metadata from filename."""
    actual_file_name: str
    site_name: str
    video_title: Optional[str]
    extract_date: Optional[str]


@dataclass
class FileContent:
    """Parsed content sections from Markdown file."""
    transcript: Optional[str]
    summary: Optional[str]
    mind_map: Optional[str]
    key_takeaway: Optional[str]


def parse_filename(filename: str) -> FileMetadata:
    """
    Parse filename following pattern: hs-[title]-youtube_[timestamp].md
    """
    actual_file_name = filename
    site_name = "custom"
    video_title = None
    extract_date = None
    
    # Check if it's a YouTube summary
    if "youtube" in filename.lower():
        site_name = "youtube"
    
    # Try to extract title and timestamp
    pattern = r'^hs-(.+?)-(youtube|custom)_(.+?)\.md$'
    match = re.match(pattern, filename, re.IGNORECASE)
    
    if match:
        video_title = match.group(1).replace('-', ' ').title()
        site_name = match.group(2).lower()
        extract_date = match.group(3)
    else:
        # Fallback: try simpler patterns
        simple_pattern = r'^hs-(.+?)_(.+?)\.md$'
        simple_match = re.match(simple_pattern, filename, re.IGNORECASE)
        
        if simple_match:
            title_part = simple_match.group(1)
            extract_date = simple_match.group(2)
            
            if '-youtube' in title_part.lower():
                parts = title_part.rsplit('-youtube', 1)
                video_title = parts[0].replace('-', ' ').title()
                site_name = "youtube"
            else:
                video_title = title_part.replace('-', ' ').title()
        else:
            # Last resort: just use filename without extension
            video_title = filename.replace('.md', '').replace('-', ' ').replace('_', ' ').title()
    
    return FileMetadata(
        actual_file_name=actual_file_name,
        site_name=site_name,
        video_title=video_title,
        extract_date=extract_date
    )


def strip_html_tags(text: str) -> str:
    """Remove HTML tags from text."""
    if not text:
        return text
    # Remove tags like <h4>, </h4>, <li>, <ol>, <ul>, <hr>, etc.
    # Pattern matches anything between < and >
    clean_text = re.sub(r'<[^>]+>', '', text)
    return clean_text.strip()


def parse_content(content: str) -> FileContent:
    """
    Parse Markdown content to extract specific sections.
    Flexible header identification: matches # Summary, ### **Summary**, etc.
    """
    if not content:
        return FileContent(None, None, None, None)

    # Define the specific headers we are looking for
    # ID 1: Original Transcript
    # ID 2: Summary
    # ID 3: Mind Map
    # ID 4: Key Takeaway
    section_markers = [
        {"id": "transcript", "label": "Transcript", "pattern": r'^#+\s*(\*\*)?Original Transcript(\*\*)?.*$'},
        {"id": "summary", "label": "Summary", "pattern": r'^#+\s*(\*\*)?Summary(\*\*)?.*$'},
        {"id": "mind_map", "label": "Mind Map", "pattern": r'^#+\s*(\*\*)?Mind Map(\*\*)?.*$'},
        {"id": "key_takeaway", "label": "Key Takeaway", "pattern": r'^#+\s*(\*\*)?Key Takeaway(s)?(\*\*)?.*$'}
    ]
    
    # Find all occurrences of these markers
    found_markers = []
    for marker in section_markers:
        for m in re.finditer(marker["pattern"], content, re.MULTILINE | re.IGNORECASE):
            found_markers.append({
                "id": marker["id"],
                "label": marker["label"],
                "full_match": m.group(0),
                "start": m.start(),
                "end": m.end()
            })
    
    # Sort markers by their position in the file
    found_markers.sort(key=lambda x: x["start"])
    
    # Remove duplicates (if the same section is matched twice by different patterns, which shouldn't happen here)
    # Actually, if we have two markers very close (overlap), we take the first one
    unique_markers = []
    last_end = -1
    for m in found_markers:
        if m["start"] >= last_end:
            unique_markers.append(m)
            last_end = m["end"]
    
    found_markers = unique_markers
    
    # Log found sections for debugging
    sections_found_list = [m["full_match"].strip() for m in found_markers]
    logger.debug(f"Found sections: {sections_found_list}")

    # Fallback Logic: If Transcript, Mind Map, and Key Takeaway are absent, 
    # treat all text as Summary.
    ids_found = {m["id"] for m in found_markers}
    if "transcript" not in ids_found and "mind_map" not in ids_found and "key_takeaway" not in ids_found:
        logger.info("Sections 1, 3, and 4 are absent. Treating entire file as Summary.")
        return FileContent(
            transcript=None,
            summary=strip_html_tags(content),
            mind_map=None,
            key_takeaway=None
        )
    
    # Otherwise, extract content between found markers
    extracted = {
        "transcript": None,
        "summary": None,
        "mind_map": None,
        "key_takeaway": None
    }
    
    for i, marker in enumerate(found_markers):
        content_start = marker["end"]
        # End at the start of the next marker
        content_end = found_markers[i+1]["start"] if i+1 < len(found_markers) else len(content)
        
        section_text = content[content_start:content_end].strip()
        if section_text:
            extracted[marker["id"]] = strip_html_tags(section_text)
    
    # Secondary Fallback:
    # If a file has Transcript but no Summary, take a snippet as Summary
    if not extracted["summary"] and extracted["transcript"]:
        paragraphs = extracted["transcript"].split('\n\n')
        snippet = '\n\n'.join(paragraphs[:5])
        if len(snippet) > 2000:
            snippet = snippet[:2000] + "..."
        extracted["summary"] = snippet

    return FileContent(
        transcript=extracted["transcript"],
        summary=extracted["summary"],
        mind_map=extracted["mind_map"],
        key_takeaway=extracted["key_takeaway"]
    )


def process_file(file_path: Path) -> tuple[FileMetadata, FileContent]:
    """
    Process a single Markdown file.
    """
    metadata = parse_filename(file_path.name)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    file_content = parse_content(content)
    return metadata, file_content


def find_markdown_files(directory: Path) -> list[Path]:
    """Find all .md files in a directory."""
    return list(directory.glob("*.md"))


if __name__ == "__main__":
    test_content = """# Summary\nThis is the summary.\n### **Mind Map**\n- Item 1"""
    result = parse_content(test_content)
    print(f"Summary: {result.summary}")
    print(f"Mind Map: {result.mind_map}")
