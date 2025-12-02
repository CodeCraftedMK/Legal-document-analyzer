import motor.motor_asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Always load the .env that lives next to this file to avoid picking up
# a different .env or OS-level environment variable by mistake.
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]