#!/usr/bin/env python3
"""
Test runner script for the Electricity Market Game backend
Run this to execute all tests with proper configuration
"""

import sys
import subprocess
import os
from pathlib import Path

def run_tests():
    """Run all backend tests with proper configuration"""
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    print("🧪 Running Electricity Market Game Backend Tests")
    print("=" * 60)
    
    # Test configuration
    test_args = [
        "python", "-m", "pytest",
        "test_market_game_api.py",
        "-v",                    # Verbose output
        "--tb=short",           # Short traceback format
        "--durations=10",       # Show 10 slowest tests
        "--color=yes",          # Colored output
        "--strict-markers",     # Strict marker checking
        "--disable-warnings",   # Disable warnings for cleaner output
        "-x"                    # Stop on first failure
    ]
    
    try:
        # Run tests
        result = subprocess.run(test_args, capture_output=False, text=True)
        
        if result.returncode == 0:
            print("\n✅ All tests passed successfully!")
            print("🎉 The Electricity Market Game backend is working correctly.")
        else:
            print(f"\n❌ Tests failed with return code {result.returncode}")
            print("🔧 Please check the test output above for details.")
            
        return result.returncode
        
    except FileNotFoundError:
        print("❌ Error: pytest not found. Please install test dependencies:")
        print("   pip install pytest pytest-asyncio httpx")
        return 1
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return 1

def run_coverage():
    """Run tests with coverage reporting"""
    
    print("📊 Running tests with coverage analysis...")
    
    coverage_args = [
        "python", "-m", "pytest",
        "test_market_game_api.py",
        "--cov=market_game_api",
        "--cov-report=html",
        "--cov-report=term",
        "--cov-fail-under=80",  # Require 80% coverage
        "-v"
    ]
    
    try:
        result = subprocess.run(coverage_args, capture_output=False, text=True)
        
        if result.returncode == 0:
            print("\n✅ Coverage analysis complete!")
            print("📈 Coverage report generated in htmlcov/index.html")
        else:
            print(f"\n❌ Coverage analysis failed with return code {result.returncode}")
            
        return result.returncode
        
    except FileNotFoundError:
        print("❌ Error: pytest-cov not found. Please install:")
        print("   pip install pytest-cov")
        return 1

def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Run Electricity Market Game tests')
    parser.add_argument('--coverage', action='store_true', help='Run with coverage analysis')
    parser.add_argument('--quick', action='store_true', help='Run quick tests only')
    
    args = parser.parse_args()
    
    if args.coverage:
        return run_coverage()
    else:
        return run_tests()

if __name__ == "__main__":
    exit(main())