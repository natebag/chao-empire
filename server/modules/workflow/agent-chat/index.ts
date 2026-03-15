import { DatabaseSync } from "node:sqlite";

// ---------------------------------------------------------------------------
// Message pools
// ---------------------------------------------------------------------------

const GENERIC_MESSAGES: string[] = [
  "nice commit! 🎉",
  "coffee break? ☕",
  "this test is tricky...",
  "shipped it! 🚀",
  "lgtm 👍",
  "need a code review?",
  "that bug was sneaky 🐛",
  "let's pair on this",
  "almost done!",
  "taking a breather",
  "learned something new today!",
  "who wants coffee? ☕",
  "that refactor was clean ✨",
  "standup in 5?",
  "great progress today!",
  "just pushed a fix 🔧",
  "anyone else stuck on this?",
];

const MOOD_MESSAGES: Record<string, string[]> = {
  happy: [
    "loving the vibe today! 😊",
    "everything is clicking!",
    "this is going so well 🎶",
  ],
  frustrated: [
    "ugh, why won't this work...",
    "need a rubber duck 🦆",
    "third try... let's go again",
  ],
  tired: [
    "running on fumes here 😴",
    "is it nap time yet?",
    "caffeine levels critical ☕",
  ],
  excited: [
    "this feature is gonna be awesome!",
    "can't wait to demo this! 🤩",
    "we're on fire today! 🔥",
  ],
  curious: [
    "hmm, what if we tried...?",
    "just read something interesting 🤔",
    "anyone know how this works?",
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface IdleAgent {
  id: string;
  name: string;
  mood: string | null;
  avatar_emoji: string | null;
  room: string | null;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMessage(mood: string | null): string {
  // 40% chance to use mood-specific message if mood has a pool
  if (mood && MOOD_MESSAGES[mood] && Math.random() < 0.4) {
    return pickRandom(MOOD_MESSAGES[mood]);
  }
  return pickRandom(GENERIC_MESSAGES);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function maybeGenerateIdleChat(
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
): boolean {
  // 10% chance per call
  if (Math.random() >= 0.1) {
    return false;
  }

  // Query idle / break agents with room assignments
  const stmt = db.prepare(`
    SELECT a.id, a.name, a.mood, a.avatar_emoji, r.room
    FROM agents a LEFT JOIN room_assignments r ON r.agent_id = a.id
    WHERE a.status IN ('idle', 'break') AND a.name != '' LIMIT 20
  `);
  const agents = stmt.all() as IdleAgent[];

  if (agents.length < 2) {
    return false;
  }

  // Pick a random sender
  const sender = pickRandom(agents);

  // Prefer a receiver in the same room, fallback to any other agent
  const sameRoom = agents.filter(
    (a) => a.id !== sender.id && a.room != null && a.room === sender.room,
  );
  const others = agents.filter((a) => a.id !== sender.id);
  const receiver = sameRoom.length > 0 ? pickRandom(sameRoom) : pickRandom(others);

  const message = pickMessage(sender.mood);
  const now = new Date().toISOString();

  // Persist to agent_chats
  const insertStmt = db.prepare(
    "INSERT INTO agent_chats (from_agent_id, to_agent_id, message, created_at) VALUES (?, ?, ?, ?)",
  );
  const result = insertStmt.run(sender.id, receiver.id, message, now);
  const chatId = Number(result.lastInsertRowid);

  // Broadcast new_message event
  broadcast("new_message", {
    id: chatId,
    sender_type: "agent",
    sender_id: sender.id,
    sender_name: sender.name,
    sender_avatar: sender.avatar_emoji,
    receiver_type: "agent",
    receiver_id: receiver.id,
    content: message,
    message_type: "chat",
    task_id: null,
    created_at: now,
  });

  // Broadcast agent_chat_bubble event
  broadcast("agent_chat_bubble", {
    agentId: sender.id,
    agentName: sender.name,
    targetAgentId: receiver.id,
    message,
    timestamp: now,
  });

  return true;
}
