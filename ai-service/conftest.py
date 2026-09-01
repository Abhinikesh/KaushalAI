import sys
import os

# Make the ai-service root importable as a package root when running pytest
# from the ai-service/ directory or from the repo root.
sys.path.insert(0, os.path.dirname(__file__))
