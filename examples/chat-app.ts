import { TypeSafeEmitter } from '../src';

// Define chat application event types
interface ChatEvents {
  messageReceived: {
    messageId: string;
    senderId: string;
    content: string;
    timestamp: number;
    roomId: string;
  };
  userTyping: {
    userId: string;
    roomId: string;
    isTyping: boolean;
  };
  userPresence: {
    userId: string;
    status: 'online' | 'offline' | 'away' | 'busy';
    lastSeen?: number;
  };
  roomJoined: {
    userId: string;
    roomId: string;
    joinedAt: number;
  };
  roomLeft: {
    userId: string;
    roomId: string;
    leftAt: number;
  };
  messageReaction: {
    messageId: string;
    userId: string;
    reaction: '👍' | '❤️' | '😄' | '😢' | '😮';
  };
}

class ChatRoom {
  private events = new TypeSafeEmitter<ChatEvents>();
  private activeUsers = new Set<string>();
  private typingUsers = new Set<string>();
  private messages: ChatEvents['messageReceived'][] = [];

  constructor(private roomId: string) {
    // Track user presence
    this.events.on('userPresence', ({ userId, status }) => {
      if (status === 'online') {
        this.activeUsers.add(userId);
      } else {
        this.activeUsers.delete(userId);
      }
      this.logActiveUsers();
    });

    // Track typing status
    this.events.on('userTyping', ({ userId, isTyping }) => {
      if (isTyping) {
        this.typingUsers.add(userId);
      } else {
        this.typingUsers.delete(userId);
      }
      this.logTypingStatus();
    });

    // Store messages
    this.events.on('messageReceived', (message) => {
      this.messages.push(message);
      this.logNewMessage(message);
    });

    // Handle reactions
    this.events.on('messageReaction', this.handleReaction.bind(this));
  }

  private logActiveUsers() {
    console.log(`Active users: ${Array.from(this.activeUsers).join(', ') || 'none'}`);
  }

  private logTypingStatus() {
    const typing = Array.from(this.typingUsers);
    if (typing.length > 0) {
      console.log(`${typing.join(', ')} ${typing.length === 1 ? 'is' : 'are'} typing...`);
    }
  }

  private logNewMessage(message: ChatEvents['messageReceived']) {
    console.log(`[${new Date(message.timestamp).toLocaleTimeString()}] ${message.senderId}: ${message.content}`);
  }

  private handleReaction(data: ChatEvents['messageReaction']) {
    const message = this.messages.find(m => m.messageId === data.messageId);
    if (message) {
      console.log(`${data.userId} reacted with ${data.reaction} to message: "${message.content}"`);
    }
  }

  // Simulate chat activity
  simulateActivity() {
    const users = ['Alice', 'Bob', 'Charlie'];
    let messageId = 1;

    // Users join the room
    users.forEach(userId => {
      this.events.emit('roomJoined', {
        userId,
        roomId: this.roomId,
        joinedAt: Date.now()
      });

      this.events.emit('userPresence', {
        userId,
        status: 'online'
      });
    });

    // Simulate typing and messaging
    setTimeout(() => {
      this.events.emit('userTyping', {
        userId: 'Alice',
        roomId: this.roomId,
        isTyping: true
      });
    }, 1000);

    setTimeout(() => {
      this.events.emit('messageReceived', {
        messageId: `msg${messageId++}`,
        senderId: 'Alice',
        content: 'Hey everyone! 👋',
        timestamp: Date.now(),
        roomId: this.roomId
      });

      this.events.emit('userTyping', {
        userId: 'Alice',
        roomId: this.roomId,
        isTyping: false
      });
    }, 2000);

    setTimeout(() => {
      this.events.emit('userTyping', {
        userId: 'Bob',
        roomId: this.roomId,
        isTyping: true
      });
    }, 2500);

    setTimeout(() => {
      this.events.emit('messageReceived', {
        messageId: `msg${messageId++}`,
        senderId: 'Bob',
        content: 'Hi Alice! How are you?',
        timestamp: Date.now(),
        roomId: this.roomId
      });

      this.events.emit('userTyping', {
        userId: 'Bob',
        roomId: this.roomId,
        isTyping: false
      });
    }, 3500);

    // Simulate reactions
    setTimeout(() => {
      this.events.emit('messageReaction', {
        messageId: 'msg1',
        userId: 'Charlie',
        reaction: '👍'
      });
    }, 4000);

    // Simulate user going offline
    setTimeout(() => {
      this.events.emit('userPresence', {
        userId: 'Bob',
        status: 'offline',
        lastSeen: Date.now()
      });

      this.events.emit('roomLeft', {
        userId: 'Bob',
        roomId: this.roomId,
        leftAt: Date.now()
      });
    }, 5000);
  }
}

// Example usage
console.log('Starting chat room simulation...\n');
const chatRoom = new ChatRoom('general');
chatRoom.simulateActivity(); 