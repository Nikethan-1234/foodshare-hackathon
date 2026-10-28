import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=os.path.dirname(__file__), pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("\n" + "="*60)
        print("ALL AUTOMATED TESTS PASSED SUCCESSFULLY!")
        print("="*60)
        sys.exit(0)
    else:
        print("\n" + "="*60)
        print("SOME TESTS FAILED.")
        print("="*60)
        sys.exit(1)
