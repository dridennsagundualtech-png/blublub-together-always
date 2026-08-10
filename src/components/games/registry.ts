import type { ReactElement } from "react";
import { TicTacToe, newTicTacToe } from "@/components/games/TicTacToe";
import { Rps, newRps } from "@/components/games/Rps";
import { Memory, newMemory } from "@/components/games/Memory";
import { ConnectFour, newConnect4 } from "@/components/games/ConnectFour";
import { War, newWar } from "@/components/games/War";
import type { GameViewProps } from "@/components/games/GameShell";
import type { GameKind } from "@/lib/games";

export const GAME_REGISTRY: Record<
  GameKind,
  { view: (p: GameViewProps) => ReactElement; newState: () => unknown }
> = {
  tictactoe: { view: TicTacToe, newState: newTicTacToe },
  rps: { view: Rps, newState: newRps },
  memory: { view: Memory, newState: newMemory },
  connect4: { view: ConnectFour, newState: newConnect4 },
  war: { view: War, newState: newWar },
};

export function isGameKind(kind: string): kind is GameKind {
  return Object.prototype.hasOwnProperty.call(GAME_REGISTRY, kind);
}
