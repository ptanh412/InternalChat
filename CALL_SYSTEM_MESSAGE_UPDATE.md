# Call System Message Update Summary

## Cập nhật đã thực hiện

### 1. Enhanced `logCallSystemMessage` function

**Vị trí**: `d:\InternalChat\backend\socket\socket.js` (dòng 634-738)

**Chức năng mới**:
- Khi cuộc gọi kết thúc (`completed`) hoặc bị lỡ (`missed`), hệ thống sẽ tự động emit `lastMessage` update cho tất cả thành viên trong conversation
- Không cần reload trang để thấy tin nhắn system mới nhất

### 2. Chi tiết cập nhật

#### Trước khi cập nhật:
```javascript
// Chỉ emit tin nhắn vào conversation room
io.to(call.conversationId.toString()).emit('message:new', populatedSystemMessage);
```

#### Sau khi cập nhật:
```javascript
// Emit tin nhắn vào conversation room
io.to(call.conversationId.toString()).emit('message:new', populatedSystemMessage);

// Đối với cuộc gọi ended hoặc missed, emit lastMessage update cho tất cả participants
if (call.status === 'completed' || call.status === 'missed') {
    const conversationMembers = await ConversationMember.find({
        conversationId: call.conversationId
    }).lean().exec();

    const convIdString = call.conversationId.toString();

    for (const member of conversationMembers) {
        const memberIdString = member.memberId.toString();
        const memberSocketId = userSocketMap.get(memberIdString);

        if (memberSocketId) {
            const isInRoom = isUserActiveInConversation(memberIdString, convIdString);

            if (!isInRoom) {
                // Tăng unread count cho user không active trong conversation
                await ConversationMember.findOneAndUpdate(
                    {
                        conversationId: call.conversationId,
                        memberId: member.memberId
                    },
                    { $inc: { unreadCount: 1 } }
                );

                // Emit với unread count = 1
                io.to(memberSocketId).emit('chat:update', {
                    type: 'last_message_update',
                    data: {
                        conversationId: call.conversationId,
                        lastMessage: populatedSystemMessage,
                        unreadCount: 1,
                        isIncrement: true
                    }
                });
            } else {
                // Emit với unread count = 0 cho user đang active
                io.to(memberSocketId).emit('chat:update', {
                    type: 'last_message_update',
                    data: {
                        conversationId: call.conversationId,
                        lastMessage: populatedSystemMessage,
                        unreadCount: 0
                    }
                });
            }
        }
    }
}
```

### 3. Lợi ích

1. **Real-time updates**: Người dùng sẽ thấy lastMessage được cập nhật ngay lập tức
2. **Smart unread counting**: 
   - User đang active trong conversation: unreadCount = 0
   - User không active: unreadCount tăng 1
3. **Better UX**: Không cần refresh để thấy tin nhắn system mới

### 4. Events được emit

#### `message:new`
- Emit vào conversation room cho users đang active
- Chứa full system message với sender info

#### `chat:update` với type `last_message_update`  
- Emit cho từng user individually
- Chứa:
  - `conversationId`: ID của conversation
  - `lastMessage`: System message đã được populate
  - `unreadCount`: 0 hoặc 1 tùy theo trạng thái user
  - `isIncrement`: true nếu unreadCount được tăng

### 5. Điều kiện trigger

Function chỉ emit `chat:update` khi:
- `call.status === 'completed'` HOẶC `call.status === 'missed'`
- Không emit cho `declined`, `failed` hoặc status khác

### 6. Test case

File test đã được tạo: `d:\InternalChat\backend\test-call-system-message.js`

Kết quả test:
- ✅ `completed`: Emit lastMessage update
- ✅ `missed`: Emit lastMessage update  
- ❌ `declined`: Không emit
- ❌ `failed`: Không emit

## Frontend Integration

Frontend cần lắng nghe event `chat:update` với type `last_message_update` để:

1. Cập nhật lastMessage trong conversation list
2. Cập nhật unread count tương ứng
3. Hiển thị notification nếu cần

```javascript
socket.on('chat:update', (data) => {
    if (data.type === 'last_message_update') {
        // Update conversation lastMessage and unreadCount
        updateConversationLastMessage(data.data);
    }
});
```
