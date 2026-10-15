import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { tokenMatches } from "@/src/lib/tokens";
import { broadcastRoomEvent } from "@/src/lib/realtime-server";
import { createTugOfWarState, resolveTugOfWarRound, type TugOfWarState } from "@/src/core/game";

interface AnswerBody {
  playerId?: string;
  answer?: string;
  responseTimeMs?: number;
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
      .eq("game_mode", "tug-of-war")
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
      game_mode: "tug-of-war",
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
      .eq("game_mode", "tug-of-war")
      .eq("round_number", room.current_round);

    if (answersError) throw answersError;

    let resolved = false;
    let nextState: TugOfWarState | null = null;

    if (roundAnswers?.length === 2) {
      const { data: players } = await supabase
        .from("arena_players")
        .select("id, side")
        .eq("room_id", room.id);

      const sideById = new Map((players ?? []).map((item) => [item.id, item.side]));
      const bySide = new Map(roundAnswers.map((item) => [sideById.get(item.player_id), item]));
      const answerA = bySide.get("A");
      const answerB = bySide.get("B");

      if (answerA && answerB) {
        const current = (room.game_state ?? createTugOfWarState()) as TugOfWarState;
        nextState = resolveTugOfWarRound(
          current,
          {
            player: "A",
            correct: answerA.is_correct,
            difficulty: answerA.power_awarded === 3 ? "hard" : answerA.power_awarded === 2 ? "medium" : "easy",
            responseTimeMs: answerA.response_time_ms,
          },
          {
            player: "B",
            correct: answerB.is_correct,
            difficulty: answerB.power_awarded === 3 ? "hard" : answerB.power_awarded === 2 ? "medium" : "easy",
            responseTimeMs: answerB.response_time_ms,
          },
        );

        const status = nextState.winner ? "finished" : "paused";
        const { error: updateError } = await supabase
          .from("arena_rooms")
          .update({
            game_state: nextState,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", room.id);
        if (updateError) throw updateError;

        resolved = true;
        await broadcastRoomEvent(code, "round-resolved", {
          roundNumber: room.current_round,
          state: nextState,
          answers: {
            A: { correct: answerA.is_correct, power: answerA.power_awarded },
            B: { correct: answerB.is_correct, power: answerB.power_awarded },
          },
          matchFinished: Boolean(nextState.winner),
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
