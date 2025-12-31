"""CLI for Holler Summary Manager - ETL and Vectorization modes."""

import argparse
from pathlib import Path

from app.config import DATA_DIR
from app.database import (
    init_database,
    insert_file_metadata,
    insert_file_contents,
    update_embedding,
    get_files_without_embeddings,
    get_all_files
)
from app.services.parser import process_file, find_markdown_files
from app.services.embeddings import generate_embedding, get_current_model


def mode1_etl(directory: Path):
    """
    Mode 1: Extract metadata/content and load into SQLite.
    
    Parses all .md files in the directory and stores metadata and content.
    """
    print(f"\n📁 Mode 1: ETL Processing")
    print(f"   Directory: {directory}")
    print("-" * 50)
    
    # Initialize database
    init_database()
    
    # Find all markdown files
    md_files = find_markdown_files(directory)
    
    if not md_files:
        print("❌ No .md files found in directory")
        return
    
    print(f"📄 Found {len(md_files)} .md files\n")
    
    processed = 0
    failed = 0
    
    for file_path in md_files:
        try:
            print(f"  Processing: {file_path.name}...", end=" ")
            
            metadata, content = process_file(file_path)
            
            # Insert metadata
            file_id = insert_file_metadata(
                actual_file_name=metadata.actual_file_name,
                site_name=metadata.site_name,
                video_title=metadata.video_title,
                extract_date=metadata.extract_date
            )
            
            # Insert content
            insert_file_contents(
                file_id=file_id,
                transcript=content.transcript,
                summary=content.summary,
                mind_map=content.mind_map,
                key_takeaway=content.key_takeaway
            )
            
            print(f"✅ (ID: {file_id})")
            processed += 1
            
        except Exception as e:
            print(f"❌ Error: {e}")
            failed += 1
    
    print("-" * 50)
    print(f"✅ Processed: {processed}")
    print(f"❌ Failed: {failed}")


def mode2_vectorize():
    """
    Mode 2: Generate embeddings for all files without embeddings.
    
    Reads from SQLite, computes embeddings via Ollama, and updates vector columns.
    """
    print(f"\n🧠 Mode 2: Vectorization")
    print("-" * 50)
    
    # Initialize database
    init_database()
    
    # Get files without embeddings
    files = get_files_without_embeddings()
    
    if not files:
        print("✨ All files already have embeddings!")
        return
    
    print(f"📄 Found {len(files)} files needing embeddings\n")
    
    model = get_current_model()
    print(f"🤖 Using model: {model}\n")
    
    processed = 0
    failed = 0
    
    for file in files:
        file_id = file['id']
        title = file.get('video_title', 'Unknown')
        summary = file.get('summary', '')
        
        print(f"  Embedding: {title[:50]}...", end=" ")
        
        if not summary:
            print("⏭️ No summary content")
            continue
        
        embedding = generate_embedding(summary)
        
        if embedding:
            update_embedding(file_id, embedding, model)
            print(f"✅ ({len(embedding)} dims)")
            processed += 1
        else:
            print("❌ Failed to generate")
            failed += 1
    
    print("-" * 50)
    print(f"✅ Vectorized: {processed}")
    print(f"❌ Failed: {failed}")


def show_status():
    """Show current database status."""
    print(f"\n📊 Database Status")
    print("-" * 50)
    
    init_database()
    files = get_all_files()
    
    if not files:
        print("📭 Database is empty")
        return
    
    total = len(files)
    with_embedding = sum(1 for f in files if f.get('has_embedding'))
    without_embedding = total - with_embedding
    
    print(f"📄 Total files: {total}")
    print(f"✅ With embeddings: {with_embedding}")
    print(f"⏳ Pending embeddings: {without_embedding}")
    print("-" * 50)
    
    if files:
        print("\nRecent files:")
        for f in files[:5]:
            status = "✅" if f.get('has_embedding') else "⏳"
            print(f"  {status} {f.get('video_title', 'Unknown')[:40]}")


def main():
    parser = argparse.ArgumentParser(
        description="Holler Summary Manager CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py --mode 1 --directory ./data     # ETL: Parse and load files
  python cli.py --mode 2                        # Vectorize: Generate embeddings
  python cli.py --status                        # Show database status
        """
    )
    
    parser.add_argument(
        "--mode",
        type=int,
        choices=[1, 2],
        help="Processing mode: 1=ETL (parse files), 2=Vectorization (generate embeddings)"
    )
    
    parser.add_argument(
        "--directory",
        type=str,
        default=str(DATA_DIR),
        help=f"Directory containing .md files (default: {DATA_DIR})"
    )
    
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show database status"
    )
    
    args = parser.parse_args()
    
    if args.status:
        show_status()
    elif args.mode == 1:
        directory = Path(args.directory)
        if not directory.exists():
            print(f"❌ Directory not found: {directory}")
            return
        mode1_etl(directory)
    elif args.mode == 2:
        mode2_vectorize()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
