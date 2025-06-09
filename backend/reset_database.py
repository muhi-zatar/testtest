#!/usr/bin/env python3
"""
Database reset utility for the Electricity Market Game
Use this if the database gets corrupted or you want a fresh start
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

def reset_database():
    """Reset the database and recreate with fresh sample data"""
    try:
        db_file = Path(__file__).parent / "electricity_market_yearly.db"
        
        # Remove the existing database file
        if db_file.exists():
            os.remove(db_file)
            print("🗑️  Removed existing database file")
        
        # Import after removing the file to ensure clean creation
        from market_game_api import SessionLocal, Base, engine
        from startup import create_sample_data
        
        # Create fresh tables
        print("🔧 Creating fresh database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
        
        # Create sample data
        print("📊 Creating sample data...")
        result = create_sample_data()
        
        if result:
            print("✅ Database reset completed successfully!")
            print(f"   📅 Game Session: {result['game_session_id']}")
            print(f"   👥 Utilities: {', '.join(result['utility_ids'])}")
            print(f"   🏭 Total Capacity: {result.get('total_capacity_mw', 'Unknown')} MW")
            print(f"   🔋 Technologies: {', '.join(result.get('technologies', []))}")
            return True
        else:
            print("❌ Failed to create sample data after reset")
            return False
            
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        import traceback
        traceback.print_exc()
        return False

def backup_database():
    """Create a backup of the current database"""
    try:
        import shutil
        from datetime import datetime
        
        db_file = Path(__file__).parent / "electricity_market_yearly.db"
        
        if not db_file.exists():
            print("ℹ️  No database file to backup")
            return True
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = Path(__file__).parent / f"electricity_market_yearly_backup_{timestamp}.db"
        
        shutil.copy2(db_file, backup_file)
        print(f"✅ Database backed up to: {backup_file.name}")
        return True
        
    except Exception as e:
        print(f"❌ Error backing up database: {e}")
        return False

def main():
    """Main function"""
    print("🔌 Electricity Market Game - Database Reset Utility")
    print("=" * 60)
    
    # Ask for confirmation
    print("⚠️  WARNING: This will completely reset your database!")
    print("   All game progress, users, and plants will be lost.")
    print("   Only sample data will remain.")
    
    response = input("\n❓ Do you want to continue? (yes/no): ").lower().strip()
    
    if response not in ['yes', 'y']:
        print("❌ Database reset cancelled")
        return 0
    
    # Create backup first
    print("\n💾 Creating backup of current database...")
    backup_success = backup_database()
    
    if not backup_success:
        proceed = input("⚠️  Backup failed. Continue anyway? (yes/no): ").lower().strip()
        if proceed not in ['yes', 'y']:
            print("❌ Database reset cancelled")
            return 0
    
    # Reset the database
    print("\n🔄 Resetting database...")
    success = reset_database()
    
    if success:
        print("\n✅ Database reset completed!")
        print("\n🚀 Next steps:")
        print("   1. Start your backend server: python startup.py --dev")
        print("   2. Start your frontend: npm run dev")
        print("   3. The game should now work with fresh sample data")
    else:
        print("\n❌ Database reset failed. Check the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())