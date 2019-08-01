import os


SECRET_KEY = "KJKLSJADJKSKJHASKHFKHASKJFH"

FILE_UPLOAD_PATH = os.path.abspath("static/uploads")

ALLOWED_FILES = ["CSV", "TSV"]

MAX_SIZE_FILE = 20 * 1000

MACHINE_LEARNING_PATH = os.path.abspath("machine_learning")

# max size of accepted file
MAX_CONTENT_LENGTH = 2000000


 