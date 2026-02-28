from datetime import datetime
from typing import List, Optional
from bson import ObjectId
import motor.motor_asyncio


class ConversationManager:
    """
    Manages chat conversations and message history in MongoDB.
    """
    
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        self.db = db
        self.conversations = db["conversations"]
        self.messages = db["messages"]
    
    async def create_conversation(
        self,
        user_id: str,
        job_id: str,
        title: Optional[str] = None
    ) -> str:
        """
        Create a new conversation thread.
        
        Returns:
            conversation_id: The ID of the created conversation
        """
        conversation = {
            "user_id": user_id,
            "job_id": job_id,
            "title": title or "New Conversation",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "message_count": 0
        }
        
        result = await self.conversations.insert_one(conversation)
        return str(result.inserted_id)
    
    async def get_conversation(self, conversation_id: str) -> Optional[dict]:
        """
        Get conversation metadata.
        """
        try:
            conv_oid = ObjectId(conversation_id)
            conversation = await self.conversations.find_one({"_id": conv_oid})
            if conversation:
                conversation["id"] = str(conversation.pop("_id"))
            return conversation
        except Exception as e:
            print(f"Error getting conversation: {e}")
            return None
    
    async def get_user_conversations(
        self,
        user_id: str,
        job_id: Optional[str] = None,
        limit: int = 50
    ) -> List[dict]:
        """
        Get all conversations for a user, optionally filtered by job_id.
        """
        query = {"user_id": user_id}
        if job_id:
            query["job_id"] = job_id
        
        cursor = self.conversations.find(query).sort("updated_at", -1).limit(limit)
        conversations = []
        
        async for conv in cursor:
            conv["id"] = str(conv.pop("_id"))
            conversations.append(conv)
        
        return conversations
    
    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        sources: Optional[List[dict]] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """
        Add a message to a conversation.
        
        Args:
            conversation_id: ID of the conversation
            role: 'user' or 'assistant'
            content: Message content
            sources: Retrieved sources (for assistant messages)
            metadata: Additional metadata
        
        Returns:
            message_id: The ID of the created message
        """
        try:
            conv_oid = ObjectId(conversation_id)
            
            message = {
                "conversation_id": conv_oid,
                "role": role,
                "content": content,
                "sources": sources or [],
                "metadata": metadata or {},
                "created_at": datetime.utcnow()
            }
            
            result = await self.messages.insert_one(message)
            
            # Update conversation metadata
            update_data = {
                "updated_at": datetime.utcnow(),
                "$inc": {"message_count": 1}
            }
            
            # Auto-generate title from first user message
            if role == "user":
                conv = await self.conversations.find_one({"_id": conv_oid})
                if conv and conv.get("message_count", 0) == 0:
                    title = content[:50] + "..." if len(content) > 50 else content
                    update_data["title"] = title
            
            await self.conversations.update_one(
                {"_id": conv_oid},
                {"$set": update_data}
            )
            
            return str(result.inserted_id)
        
        except Exception as e:
            print(f"Error adding message: {e}")
            raise
    
    async def get_conversation_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[dict]:
        """
        Get all messages in a conversation.
        """
        try:
            conv_oid = ObjectId(conversation_id)
            
            query = {"conversation_id": conv_oid}
            cursor = self.messages.find(query).sort("created_at", 1)
            
            if limit:
                cursor = cursor.limit(limit)
            
            messages = []
            async for msg in cursor:
                msg["id"] = str(msg.pop("_id"))
                msg["conversation_id"] = str(msg["conversation_id"])
                messages.append(msg)
            
            return messages
        
        except Exception as e:
            print(f"Error getting messages: {e}")
            return []
    
    async def get_recent_messages(
        self,
        conversation_id: str,
        limit: int = 10
    ) -> List[dict]:
        """
        Get recent messages for context (most recent first).
        """
        try:
            conv_oid = ObjectId(conversation_id)
            
            cursor = self.messages.find(
                {"conversation_id": conv_oid}
            ).sort("created_at", -1).limit(limit)
            
            messages = []
            async for msg in cursor:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            
            # Reverse to get chronological order
            return list(reversed(messages))
        
        except Exception as e:
            print(f"Error getting recent messages: {e}")
            return []
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation and all its messages.
        """
        try:
            conv_oid = ObjectId(conversation_id)
            
            # Delete all messages
            await self.messages.delete_many({"conversation_id": conv_oid})
            
            # Delete conversation
            result = await self.conversations.delete_one({"_id": conv_oid})
            
            return result.deleted_count > 0
        
        except Exception as e:
            print(f"Error deleting conversation: {e}")
            return False
    
    async def update_conversation_title(
        self,
        conversation_id: str,
        title: str
    ) -> bool:
        """
        Update conversation title.
        """
        try:
            conv_oid = ObjectId(conversation_id)
            
            result = await self.conversations.update_one(
                {"_id": conv_oid},
                {"$set": {"title": title, "updated_at": datetime.utcnow()}}
            )
            
            return result.modified_count > 0
        
        except Exception as e:
            print(f"Error updating title: {e}")
            return False
    
    async def search_conversations(
        self,
        user_id: str,
        search_query: str,
        limit: int = 20
    ) -> List[dict]:
        """
        Search conversations by title or message content.
        """
        try:
            # First search in messages
            message_cursor = self.messages.find({
                "$text": {"$search": search_query}
            }).limit(limit)
            
            conversation_ids = set()
            async for msg in message_cursor:
                conversation_ids.add(msg["conversation_id"])
            
            # Also search conversation titles
            conv_cursor = self.conversations.find({
                "user_id": user_id,
                "$or": [
                    {"title": {"$regex": search_query, "$options": "i"}},
                    {"_id": {"$in": list(conversation_ids)}}
                ]
            }).sort("updated_at", -1).limit(limit)
            
            conversations = []
            async for conv in conv_cursor:
                conv["id"] = str(conv.pop("_id"))
                conversations.append(conv)
            
            return conversations
        
        except Exception as e:
            print(f"Error searching conversations: {e}")
            return []
    
    async def get_conversation_stats(self, user_id: str) -> dict:
        """
        Get statistics about user's conversations.
        """
        try:
            total_conversations = await self.conversations.count_documents({
                "user_id": user_id
            })
            
            # Get total messages
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": None,
                    "total_messages": {"$sum": "$message_count"}
                }}
            ]
            
            result = await self.conversations.aggregate(pipeline).to_list(1)
            total_messages = result[0]["total_messages"] if result else 0
            
            # Get most recent conversation
            recent = await self.conversations.find_one(
                {"user_id": user_id},
                sort=[("updated_at", -1)]
            )
            
            return {
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "last_activity": recent["updated_at"] if recent else None
            }
        
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {
                "total_conversations": 0,
                "total_messages": 0,
                "last_activity": None
            }