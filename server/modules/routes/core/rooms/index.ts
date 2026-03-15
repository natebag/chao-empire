import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import {
  getRoomOccupancies,
  getAllAssignments,
  assignRoom,
  getAgentRoom,
} from "../../../workflow/room-manager/index.ts";
import type { RoomId } from "../../../workflow/room-manager/index.ts";

interface RoomRouteDeps {
  app: Express;
  db: DatabaseSync;
  broadcast(type: string, payload: unknown): void;
}

const VALID_ROOMS: RoomId[] = ["desk", "meeting", "gym", "library", "break", "server", "ceo", "hallway"];

export function registerRoomRoutes({ app, db, broadcast }: RoomRouteDeps): void {
  // GET /api/rooms — all room occupancies (for office view)
  app.get("/api/rooms", (_req, res) => {
    try {
      const occupancies = getRoomOccupancies(db);
      res.json({ rooms: occupancies });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch room occupancies" });
    }
  });

  // GET /api/rooms/assignments — all agent→room mappings
  app.get("/api/rooms/assignments", (_req, res) => {
    try {
      const assignments = getAllAssignments(db);
      res.json({ assignments });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // GET /api/rooms/agent/:agentId — which room is this agent in?
  app.get("/api/rooms/agent/:agentId", (req, res) => {
    try {
      const room = getAgentRoom(db, req.params.agentId);
      res.json({ agentId: req.params.agentId, room });
    } catch (err) {
      res.status(500).json({ error: "Failed to get agent room" });
    }
  });

  // POST /api/rooms/assign — manually assign agent to room
  app.post("/api/rooms/assign", (req, res) => {
    try {
      const { agentId, room } = req.body;
      if (!agentId || !VALID_ROOMS.includes(room)) {
        return res.status(400).json({ error: "Valid agentId and room required" });
      }
      assignRoom(db, agentId, room);
      broadcast("room_change", { agentId, room, reason: "manual", timestamp: Date.now() });
      res.json({ ok: true, agentId, room });
    } catch (err) {
      res.status(500).json({ error: "Failed to assign room" });
    }
  });
}
