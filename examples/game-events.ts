import { TypeSafeEmitter } from '../src';

// Define the game event types with their corresponding payloads
interface GameEvents {
  playerMove: {
    playerId: string;
    position: { x: number; y: number };
    direction: 'up' | 'down' | 'left' | 'right';
  };
  collectItem: {
    playerId: string;
    itemId: string;
    itemType: 'coin' | 'powerup' | 'key';
    points: number;
  };
  gameStateChange: {
    newState: 'starting' | 'playing' | 'paused' | 'gameOver';
    timestamp: number;
  };
  scoreUpdate: {
    playerId: string;
    newScore: number;
    scoreChange: number;
  };
  playerCollision: {
    player1Id: string;
    player2Id: string;
    location: { x: number; y: number };
  };
}

class Game {
  public events = new TypeSafeEmitter<GameEvents>();
  private scores: Map<string, number> = new Map();

  constructor() {
    // Listen for score updates and maintain player scores
    this.events.on('scoreUpdate', ({ playerId, scoreChange }) => {
      const currentScore = this.scores.get(playerId) || 0;
      this.scores.set(playerId, currentScore + scoreChange);
    });

    // Handle item collection and update scores
    this.events.on('collectItem', ({ playerId, points, itemType }) => {
      console.log(`Player ${playerId} collected a ${itemType}!`);
      this.events.emit('scoreUpdate', {
        playerId,
        newScore: (this.scores.get(playerId) || 0) + points,
        scoreChange: points
      });
    });

    // Handle player collisions
    this.events.on('playerCollision', ({ player1Id, player2Id, location }) => {
      console.log(`Collision between ${player1Id} and ${player2Id} at (${location.x}, ${location.y})`);
    });
  }

  start() {
    this.events.emit('gameStateChange', {
      newState: 'starting',
      timestamp: Date.now()
    });

    // Simulate some game events
    this.simulateGameEvents();
  }

  private simulateGameEvents() {
    // Simulate player movement
    this.events.emit('playerMove', {
      playerId: 'player1',
      position: { x: 100, y: 200 },
      direction: 'right'
    });

    // Simulate collecting items
    this.events.emit('collectItem', {
      playerId: 'player1',
      itemId: 'coin1',
      itemType: 'coin',
      points: 100
    });

    // Simulate player collision
    this.events.emit('playerCollision', {
      player1Id: 'player1',
      player2Id: 'player2',
      location: { x: 150, y: 150 }
    });

    // End the game
    setTimeout(() => {
      this.events.emit('gameStateChange', {
        newState: 'gameOver',
        timestamp: Date.now()
      });

      // Print final scores
      console.log('Final Scores:', Object.fromEntries(this.scores));
    }, 1000);
  }
}

// Example usage
const game = new Game();

// Add a one-time listener for game over
game.events.once('gameStateChange', ({ newState, timestamp }) => {
  if (newState === 'gameOver') {
    console.log(`Game ended at ${new Date(timestamp).toLocaleTimeString()}`);
  }
});

// Start the game
game.start(); 