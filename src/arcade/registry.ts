/**
 * The list of solo arcade games. The rest of the app only needs this file and
 * <ArcadeCabinet />: menus read the list, the play page looks a game up by id.
 */
import type { AnyArcadeGame } from "@/arcade/engine/types";
import { hopGame } from "@/arcade/games/hop";
import { wingGame } from "@/arcade/games/wing";

export const ARCADE_GAMES: readonly AnyArcadeGame[] = [hopGame, wingGame];

export function arcadeGame(id: string): AnyArcadeGame | null {
  return ARCADE_GAMES.find((g) => g.id === id) ?? null;
}
