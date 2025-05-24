import { TypeSafeEmitter, WildcardEventHandler } from '../src'; // Adjust path if your structure is different

console.log('--- Advanced Wildcards Example ---');

// Define a sample event map
interface MyEvents {
  'user.created': { userId: string; name: string };
  'user.updated': { userId: string; changes: object };
  'user.deleted': { userId: string };
  'post.created': { postId: string; authorId: string };
  'post.published': { postId: string; url: string };
  'system.shutdown': { timestamp: number };
}

const emitter = new TypeSafeEmitter<MyEvents>();

// 1. Star Wildcard Listener (*)
console.log('\n1. Demonstrating Star Wildcard Listener (*):');
const starHandler: WildcardEventHandler = (eventName, data) => {
  console.log(`[*] Star Handler Received: Event='${eventName}', Data=`, data);
};
emitter.on('*', starHandler);

emitter.emit('user.created', { userId: 'u1', name: 'Alice' });
emitter.emit('post.published', { postId: 'p1', url: '/post/p1' });

// 2. Pattern Wildcard Listeners (e.g., 'user.*', '*.created')
console.log('\n2. Demonstrating Pattern Wildcard Listeners:');
const userSpecificHandler: WildcardEventHandler = (eventName, data) => {
  console.log(`[user.*] User Pattern Handler Received: Event='${eventName}', Data=`, data);
};
emitter.on('user.*', userSpecificHandler);

const createdSpecificHandler: WildcardEventHandler = (eventName, data) => {
  console.log(`[*.created] Created Pattern Handler Received: Event='${eventName}', Data=`, data);
};
emitter.on('*.created', createdSpecificHandler);

emitter.emit('user.updated', { userId: 'u1', changes: { name: 'Alicia' } });
emitter.emit('post.created', { postId: 'p2', authorId: 'u1' }); // Triggers '*' and '*.created'
emitter.emit('system.shutdown', { timestamp: Date.now() }); // Triggers only '*'

// 3. `once` with Wildcards
console.log('\n3. Demonstrating `once` with Wildcards:');
const onceStarHandler: WildcardEventHandler = (eventName, data) => {
  console.log(`[*] ONCE Star Handler: Event='${eventName}', Data=`, data);
};
emitter.once('*', onceStarHandler);

const onceUserPatternHandler: WildcardEventHandler = (eventName, data) => {
  console.log(`[user.*] ONCE User Pattern Handler: Event='${eventName}', Data=`, data);
};
emitter.once('user.*', onceUserPatternHandler);

console.log('Emitting user.deleted (for once handlers)...');
emitter.emit('user.deleted', { userId: 'u1' }); // Triggers regular '*', 'user.*', and both 'once' handlers.
console.log('Emitting post.published (for once star handler, user.* should be gone)...');
emitter.emit('post.published', { postId: 'p3', url: '/post/p3' }); // Triggers regular '*', but not 'once user.*'. 'once *' should be gone.
console.log('Emitting user.created (all once handlers should be gone)...');
emitter.emit('user.created', { userId: 'u2', name: 'Bob' }); // Regular handlers will still fire.

// 4. `off` with Wildcards
console.log('\n4. Demonstrating `off` with Wildcards:');
console.log('Removing "*.created" pattern handler...');
emitter.off('*.created', createdSpecificHandler);
emitter.emit('post.created', { postId: 'p4', authorId: 'u2' }); // Should not trigger removed '*.created', but '*' and 'user.*' (if it were user.created) still exist.

console.log('Removing the main "*" star handler...');
emitter.off('*', starHandler);
emitter.emit('system.shutdown', { timestamp: Date.now() }); // Should not trigger main star handler. user.* still exists.

console.log('Removing "user.*" pattern handler...');
emitter.off('user.*', userSpecificHandler);
emitter.emit('user.updated', { userId: 'u2', changes: { name: 'Robert' } }); // No user.* or main * handler.

console.log('\n--- End of Advanced Wildcards Example ---');
