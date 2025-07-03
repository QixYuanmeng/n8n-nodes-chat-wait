# Chat Wait Node Usage Examples

## Example 1: Basic Multi-turn Conversation

```json
{
  "nodes": [
    {
      "parameters": {
        "promptMessage": "How can I help you?",
        "timeoutSeconds": 300,
        "enableMemory": true,
        "memoryKey": "user_chat",
        "sessionIdField": "userId",
        "immediateOutput": true
      },
      "type": "n8n-nodes-chat-wait.chatWait",
      "typeVersion": 1,
      "position": [100, 100],
      "id": "chat-wait-1"
    }
  ]
}
```

## Example 2: AI Model Integration Workflow

### Workflow Structure:
```
Manual Trigger → Set Variables → Chat Wait → AI Chat → Simple Memory → Chat Wait (Loop)
```

### Detailed Configuration:

#### 1. Manual Trigger
Start the workflow

#### 2. Set Variables
```json
{
  "userId": "user_12345",
  "conversationId": "conv_67890",
  "systemPrompt": "You are a helpful AI assistant"
}
```

#### 3. Chat Wait (First)
```json
{
  "promptMessage": "Hello! I'm an AI assistant. How can I help you today?",
  "timeoutSeconds": 300,
  "enableMemory": true,
  "memoryKey": "conversation_history",
  "sessionIdField": "userId",
  "immediateOutput": true,
  "includeInputData": true
}
```

#### 4. AI Chat (OpenAI/Other AI Models)
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system", 
      "content": "{{ $node['Set Variables'].json.systemPrompt }}"
    },
    {
      "role": "user",
      "content": "{{ $node['Chat Wait'].json.userInput }}"
    }
  ]
}
```

#### 5. Simple Memory (Optional)
Store conversation history to external storage

#### 6. Chat Wait (Second, for continuing conversation)
```json
{
  "promptMessage": "Do you have any other questions?",
  "timeoutSeconds": 300,
  "enableMemory": true,
  "memoryKey": "conversation_history",
  "sessionIdField": "userId",
  "immediateOutput": false,
  "includeInputData": true
}
```

## Webhook Usage Example

### Send user input to Chat Wait node:

```bash
curl -X POST "http://localhost:5678/webhook/chat-wait" \
  -H "Content-Type: application/json" \
  -d '{
    "chatWaitId": "chat_wait_1704353625123_abc123",
    "userInput": "I want to learn about artificial intelligence",
    "sessionId": "user_12345"
  }'
```

### Response Format:
```json
{
  "success": true,
  "message": "User input received successfully",
  "chatWaitId": "chat_wait_1704353625123_abc123",
  "sessionId": "user_12345"
}
```

## Output Data Formats

### Continue Port Output (Immediate Output):
```json
{
  "chatWaitStatus": "immediate_output",
  "promptMessage": "How can I help you?",
  "timestamp": "2025-07-03T10:00:00.000Z",
  "originalData": "data from previous nodes..."
}
```

### User Input Port Output (After User Input):
```json
{
  "chatWaitId": "chat_wait_1704353625123_abc123",
  "sessionId": "user_12345",
  "userInput": "I want to learn about artificial intelligence",
  "timestamp": "2025-07-03T10:05:00.000Z",
  "inputData": {
    "userId": "user_12345",
    "conversationId": "conv_67890"
  },
  "chatHistory": [
    {
      "type": "user",
      "message": "I want to learn about artificial intelligence",
      "timestamp": "2025-07-03T10:05:00.000Z"
    }
  ],
  "chatWaitStatus": "user_input_received"
}
```

## Real-world Use Cases

### 1. Customer Service Bot
- User initiates inquiry → Chat Wait → AI analysis → Reply to user → Chat Wait continues

### 2. Survey/Questionnaire
- Display question → Chat Wait → Collect answer → Next question → Chat Wait

### 3. Interactive Learning
- Present knowledge → Chat Wait → Student questions → AI answers → Chat Wait continues

### 4. Multi-step Forms
- Display current step → Chat Wait → User fills out → Validate data → Next step

## Important Notes

1. **Session Management**: Ensure each user has a unique sessionId
2. **Timeout Handling**: Set reasonable timeout to avoid infinite waiting
3. **Error Handling**: Handle possible timeout or error cases in subsequent nodes
4. **Memory Limitations**: Monitor conversation history size to avoid excessive memory usage
5. **Security**: Validate user input to prevent malicious data injection
