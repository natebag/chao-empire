import type { DatabaseSync } from "node:sqlite";
import type { RoomId, RoomAssignment, RoomOccupancy } from "./types";
import { ROOM_CAPACITY } from "./types";

const ALL_ROOMS: RoomId[] = ["desk", "meeting", "gym", "library", "break", "server", "ceo", "hallway"];

export function assignRoom(db: DatabaseSync, agentId: string, room: RoomId): void {
  const now = Date.now();

  // Upsert: remove existing assignment then insert new one
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_assignments (
      agent_id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      entered_at INTEGER NOT NULL
    )
  `);

  const deleteStmt = db.prepare("DELETE FROM room_assignments WHERE agent_id = ?");
  deleteStmt.run(agentId);

  const insertStmt = db.prepare("INSERT INTO room_assignments (agent_id, room, entered_at) VALUES (?, ?, ?)");
  insertStmt.run(agentId, room, now);
}

export function getAgentRoom(db: DatabaseSync, agentId: string): RoomAssignment | null {
  const stmt = db.prepare("SELECT agent_id, room, entered_at FROM room_assignments WHERE agent_id = ?");
  const row = stmt.get(agentId) as { agent_id: string; room: RoomId; entered_at: number } | undefined;

  if (!row) return null;

  return {
    agentId: row.agent_id,
    room: row.room,
    enteredAt: row.entered_at,
  };
}

export function getRoomOccupancies(db: DatabaseSync): RoomOccupancy[] {
  const stmt = db.prepare("SELECT agent_id, room FROM room_assignments ORDER BY room, agent_id");
  const rows = stmt.all() as Array<{ agent_id: string; room: RoomId }>;

  const roomAgents = new Map<RoomId, string[]>();
  for (const room of ALL_ROOMS) {
    roomAgents.set(room, []);
  }

  for (const row of rows) {
    const agents = roomAgents.get(row.room);
    if (agents) {
      agents.push(row.agent_id);
    }
  }

  return ALL_ROOMS.map((room) => {
    const agentIds = roomAgents.get(room) ?? [];
    return {
      room,
      count: agentIds.length,
      agentIds,
      lightsOn: agentIds.length > 0,
    };
  });
}

export function getAllAssignments(db: DatabaseSync): RoomAssignment[] {
  const stmt = db.prepare("SELECT agent_id, room, entered_at FROM room_assignments ORDER BY room, entered_at");
  const rows = stmt.all() as Array<{ agent_id: string; room: RoomId; entered_at: number }>;

  return rows.map((row) => ({
    agentId: row.agent_id,
    room: row.room,
    enteredAt: row.entered_at,
  }));
}
