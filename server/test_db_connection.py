import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv(override=True)  # Override system environment variables

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

async def test_connection():
    try:
        print(f"Connecting to MongoDB Atlas...")
        if not MONGO_URI:
            print("ERROR: MONGO_URI is not set! Check your .env file.")
            return
        if not DB_NAME:
            print("ERROR: DB_NAME is not set! Check your .env file.")
            return
        print(f"URI: {MONGO_URI[:50]}...")  # Show partial URI for security
        print(f"Database name: {DB_NAME}")
        
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
        
        # Test connection by listing databases
        print("\nTesting connection...")
        db_list = await client.list_database_names()
        print(f"SUCCESS: Connected successfully! Available databases: {db_list}")
        
        # Get the database
        db = client[DB_NAME]
        
        # Create a test document to ensure the database and collection exist
        print(f"\nCreating/verifying database '{DB_NAME}'...")
        test_doc = {
            "test": True,
            "message": "Database connection test",
            "timestamp": "2024-01-01"
        }
        
        result = await db["clauses"].insert_one(test_doc)
        print(f"SUCCESS: Test document inserted with ID: {result.inserted_id}")
        
        # Verify the database now exists
        db_list_after = await client.list_database_names()
        if DB_NAME in db_list_after:
            print(f"SUCCESS: Database '{DB_NAME}' confirmed to exist!")
        else:
            print(f"WARNING: Database '{DB_NAME}' will be created on first real insert")
        
        # Clean up test document
        await db["clauses"].delete_one({"_id": result.inserted_id})
        print("SUCCESS: Test document cleaned up")
        
        # List collections in the database
        collections = await db.list_collection_names()
        print(f"SUCCESS: Collections in '{DB_NAME}': {collections}")
        
        client.close()
        print("\nSUCCESS: All tests passed! Database is ready to use.")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        print("\nPlease check:")
        print("1. MongoDB Atlas cluster is running")
        print("2. Your IP address is whitelisted in Network Access")
        print("3. Database user credentials are correct")
        print("4. Connection string in .env file is correct")

if __name__ == "__main__":
    asyncio.run(test_connection())

