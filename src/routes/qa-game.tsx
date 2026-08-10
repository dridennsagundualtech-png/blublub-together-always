import { createFileRoute } from "@tanstack/react-router";
import { GameShell } from "@/components/games/GameShell";
import { TicTacToe, newTicTacToe } from "@/components/games/TicTacToe";

export const Route = createFileRoute("/qa-game")({
  ssr: false,
  component: () => (
    <div>
      <GameShell kind="tictactoe" newState={newTicTacToe}>
        {(props) => <TicTacToe {...props} />}
      </GameShell>
    </div>
  ),
});
