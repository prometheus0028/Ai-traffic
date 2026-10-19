"""Keep explicit runtime factories in tests away from the real database.

Importing backend.main no longer opens files or starts serial threads.
"""
import os
import tempfile
os.environ.setdefault('TRAFFIC_DB', os.path.join(tempfile.mkdtemp(),'test-runtime.db'))
