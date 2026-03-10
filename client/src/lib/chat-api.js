/**
 * Chat API Service Layer
 * Handles all communication with document-based chatbot backend
 */

const API_BASE_URL = "http://localhost:8000";

/**
 * Create a new chat conversation for a document
 */
export async function createConversation(jobId, token, title) {
  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      job_id: jobId,
      title: title || `Document Chat - ${new Date().toLocaleString()}`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create conversation");
  }

  return response.json();
}

/**
 * List all conversations for the current user, optionally filtered by job_id
 */
export async function listConversations(token, jobId) {
  const params = new URLSearchParams();
  if (jobId) params.append("job_id", jobId);

  const response = await fetch(`${API_BASE_URL}/chat/conversations?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to list conversations");
  }

  const data = await response.json();
  return data.conversations;
}

/**
 * Get a specific conversation with all its messages
 */
export async function getConversation(conversationId, token) {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch conversation");
  }

  return response.json();
}

/**
 * Send a message and get a response (non-streaming)
 */
export async function sendMessage(request, token) {
  const response = await fetch(`${API_BASE_URL}/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to send message");
  }

  return response.json();
}

/**
 * Send a message and get a streaming response
 */
export async function sendMessageStream(
  request,
  token,
  onChunk,
  onDone,
  onError,
) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/message/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to stream message");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              onChunk(data.chunk);
            }
            if (data.done) {
              onDone(data.conversation_id);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Get suggested questions for a document
 */
export async function getSuggestedQuestions(jobId, token) {
  const response = await fetch(`${API_BASE_URL}/chat/suggestions/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch suggestions");
  }

  return response.json();
}

/**
 * Get user's chat statistics
 */
export async function getChatStats(token) {
  const response = await fetch(`${API_BASE_URL}/chat/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch chat stats");
  }

  return response.json();
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId, token) {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete conversation");
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(conversationId, title, token) {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update conversation");
  }
}
