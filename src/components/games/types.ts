import type { Game, Role } from "../../types";

export type GameComponentProps = {
  game: Game;
  role: Role | null;
  getNickname: (role: Role) => string;
  updateGameState: (state: Partial<Game["state"]>) => Promise<void>;
  endGame: (winner?: Role | "draw") => Promise<void>;
};
