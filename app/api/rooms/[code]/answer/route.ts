import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { tokenMatches } from "@/src/lib/tokens";
import { broadcastRoomEvent } from "@/src/lib/realtime-server";
import {
  createGameState,
  resolveArenaRound,
  type ArenaGameState,
  type Difficulty,
  type GameMode,
  type RoundAnswer,
} from "@/src/core/game";

interface AnswerBody {
  playerId?: string;
  answer?: string;
  responseTimeMs?: number;
}

function difficultyFromPower(power: number): Difficulty {
  return power >= 3 ? "hard" : power === 2 ? "medium" : "easy";
}

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const playerToken = request.headers.get("x-player-token");
    const body = (await request.json()) as AnswerBody;
    const playerId = body.playerId;
    const submittedAnswer = body.answer?.trim();
    const responseTimeMs = Math.max(0, Math.floor(Number(body.responseTimeMs) || 0));

    if (!playerId || !submittedAnswer) {
      return NextResponse.json({ error: "Jawaban tidak valid." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: room, error: roomError } = await supabase
      .from("arena_rooms")
      .select("id, code, status, current_round, current_game, game_state")
      .eq("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    }

    if (room.status !== "playing" || room.current_round < 1) {
      return NextResponse.json({ error: "Tidak ada ronde aktif." }, { status: 409 });
    }

    const gameMode = room.current_game as GameMode;
    const { data: player, error: playerError } = await supabase
      .from("arena_players")
      .select("id, side, player_token_hash")
      .eq("id", playerId)
      .eq("room_id", room.id)
      .single();

    if (playerError || !player || !tokenMatches(playerToken, player.player_token_hash)) {
      return NextResponse.json({ error: "Player token tidak valid." }, { status: 401 });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("arena_round_assignments")
      .select("question_id")
      .eq("room_id", room.id)
      .eq("player_id", player.id)
      .eq("game_mode", gameMode)
      .eq("round_number", room.current_round)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Soal ronde tidak ditemukan." }, { status: 409 });
    }

    const { data: question, error: questionError } = await supabase
      .from("arena_questions")
      .select("id, correct_answer, difficulty, power_value")
      .eq("id", assignment.question_id)
      .single();

    if (questionError || !question) throw questionError;

    const isCorrect = submittedAnswer.toUpperCase() === question.correct_answer.toUpperCase();
    const powerAwarded = isCorrect ? question.power_value : 0;

    const { error: insertError } = await supabase.from("arena_answers").insert({
      room_id: room.id,
      player_id: player.id,
      question_id: question.id,
      game_mode: gameMode,
      round_number: room.current_round,
      submitted_answer: submittedAnswer,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs,
      power_awarded: powerAwarded,
    });

    if (insertError?.code === "23505") {
      return NextResponse.json({ error: "Jawaban ronde ini sudah dikirim." }, { status: 409 });
    }
    if (insertError) throw insertError;

    const { data: roundAnswers, error: answersError } = await supabase
      .from("arena_answers")
      .select("player_id, is_correct, response_time_ms, power_awarded")
      .eq("room_id", room.id)
      .eq("game_mode", gameMode)
      .eq("round_number", room.current_round);

    if (answersError) throw answersError;

    let resolved = false;
    let nextState: ArenaGameState | null = null;

    if (roundAnswers?.length === 2) {
      const { data: players } = await supabase
        .from("arena_players")
        .select("id, side")
        .eq("room_id", room.id);

      const sideById = new Map((players ?? []).map((item) => [item.id, item.side]));
      const bySide = new Map(roundAnswers.map((item) => [sideById.get(item.player_id), item]));
      const rawA = bySide.get("A");
      const rawB = bySide.get("B");

      if (rawA && rawB) {
        const toRoundAnswer = (side: "A" | "B", raw: typeof rawA): RoundAnswer => ({
          player: side,
          correct: raw.is_correct,
          difficulty: difficultyFromPower(raw.power_awarded),
          responseTimeMs: raw.response_time_ms,
        });
        const answerA = toRoundAnswer("A", rawA);
        const answerB = toRoundAnswer("B", rawB);
        const current = ((room.game_state as ArenaGameState | null)?.kind
          ? room.game_state
          : createGameState(gameMode)) as ArenaGameState;

        nextState = resolveArenaRound(current, answerA, answerB);

        const { error: updateError } = await supabase
          .from("arena_rooms")
          .update({
            game_state: nextState,
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("id", room.id);
        if (updateError) throw updateError;

        resolved = true;
        await broadcastRoomEvent(code, "round-resolved", {
          gameMode,
          roundNumber: room.current_round,
          state: nextState,
          answers: {
            A: { correct: rawA.is_correct, power: rawA.power_awarded },
            B: { correct: rawB.is_correct, power: rawB.power_awarded },
          },
          gameComplete: nextState.complete,
        });
      }
    }

    return NextResponse.json({
      accepted: true,
      correct: isCorrect,
      powerAwarded,
      waitingForOpponent: !resolved,
      state: nextState,
    });
  } catch (error) {
    console.error("submit answer failed", error);
    return NextResponse.json({ error: "Gagal mengirim jawaban." }, { status: 500 });
  }
}
