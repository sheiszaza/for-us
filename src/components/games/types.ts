import type { Game, GameContent, Role } from "../../types";

export type GameComponentProps = {
  game: Game;
  gameContent: GameContent;
  role: Role | null;
  getNickname: (role: Role) => string;
  updateGameState: (state: Partial<Game["state"]>) => Promise<void>;
  updateGameFields: (fields: Record<string, unknown>) => Promise<void>;
  endGame: (winner?: Role | "draw") => Promise<void>;
};
