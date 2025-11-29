import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv(override=True)  # Override system environment variables to use .env file

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]