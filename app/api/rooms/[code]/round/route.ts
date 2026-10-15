import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { tokenMatches } from "@/src/lib/tokens";
import { broadcastRoomEvent } from "@/src/lib/realtime-server";
import type { Difficulty, GameMode } from "@/src/core/game";

const DIFFICULTY_CYCLE: Difficulty[] = ["easy", "medium", "medium", "hard"];
const ROUND_DURATION_SECONDS = 60;

type QuestionRow = {
  id: string;
  grade_level: number;
  topic: string;
  subtopic: string | null;
  difficulty: Difficulty;
  question_type: string;
  question_text: string;
  question_image_url: string | null;
  options: unknown;
  estimated_time_seconds: number;
  power_value: number;
};

function publicQuestion(question: QuestionRow) {
  return {
    id: question.id,
    gradeLevel: question.grade_level,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionType: question.question_type,
    questionText: question.question_text,
    questionImageUrl: question.question_image_url,
    options: question.options,
    estimatedTimeSeconds: ROUND_DURATION_SECONDS,
    powerValue: question.power_value,
  };
}

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const hostToken = request.headers.get("x-host-token");
    const supabase = createSupabaseAdmin();

    const { data: room, error: roomError } = await supabase
      .from("arena_rooms")
      .select("id, code, host_token_hash, status, current_game, current_round, game_state, opponent_mode, ai_difficulty")
      .eq("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    }

    if (!tokenMatches(hostToken, room.host_token_hash)) {
      return NextResponse.json({ error: "Host token tidak valid." }, { status: 401 });
    }

    if (room.status === "playing") {
      return NextResponse.json({ error: "Ronde sebelumnya masih berjalan." }, { status: 409 });
    }

    if (room.status === "finished") {
      return NextResponse.json({ error: "Sesi sudah selesai." }, { status: 409 });
    }

    const currentState = room.game_state as { complete?: boolean } | null;
    if (currentState?.complete) {
      return NextResponse.json({ error: "Game ini sudah selesai. Lanjutkan ke game berikutnya." }, { status: 409 });
    }

    const gameMode = room.current_game as GameMode;
    const { data: players, error: playersError } = await supabase
      .from("arena_players")
      .select("id, display_name, grade_level, side, player_type")
      .eq("room_id", room.id)
      .order("side");

    if (playersError) throw playersError;
    if (!players || players.length !== 2) {
      return NextResponse.json({ error: "Arena membutuhkan dua slot pemain: dua manusia atau satu manusia + CPU." }, { status: 409 });
    }

    const humanCount = players.filter((player) => player.player_type === "human").length;
    if (humanCount < 1) {
      return NextResponse.json({ error: "Arena membutuhkan setidaknya satu pemain manusia." }, { status: 409 });
    }

    const roundNumber = room.current_round + 1;
    const difficulty = DIFFICULTY_CYCLE[(roundNumber - 1) % DIFFICULTY_CYCLE.length];
    const questionsBySide: Record<string, ReturnType<typeof publicQuestion>> = {};

    for (const player of players) {
      const { data: candidates, error: questionError } = await supabase
        .from("arena_questions")
        .select("id, grade_level, topic, subtopic, difficulty, question_type, question_text, question_image_url, options, estimated_time_seconds, power_value")
        .eq("grade_level", player.grade_level)
        .eq("difficulty", difficulty)
        .eq("is_active", true)
        .limit(40);

      if (questionError) throw questionError;
      if (!candidates?.length) {
        return NextResponse.json(
          { error: `Belum ada soal ${difficulty} untuk kelas ${player.grade_level}. Tambahkan soal ke arena_questions.` },
          { status: 409 },
        );
      }

      const { data: usedAssignments } = await supabase
        .from("arena_round_assignments")
        .select("question_id")
        .eq("room_id", room.id)
        .eq("player_id", player.id)
        .eq("game_mode", gameMode);

      const used = new Set((usedAssignments ?? []).map((row) => row.question_id));
      const unused = candidates.filter((question) => !used.has(question.id));
      const pool = unused.length ? unused : candidates;
      const selected = pool[Math.floor(Math.random() * pool.length)] as QuestionRow;

      const { error: assignmentError } = await supabase.from("arena_round_assignments").insert({
        room_id: room.id,
        player_id: player.id,
        question_id: selected.id,
        game_mode: gameMode,
        round_number: roundNumber,
      });
      if (assignmentError) throw assignmentError;

      questionsBySide[player.side] = publicQuestion(selected);
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from("arena_rooms")
      .update({ status: "playing", current_round: roundNumber, updated_at: new Date().toISOString() })
      .eq("id", room.id)
      .select("code, status, current_game, current_round, game_state, opponent_mode, ai_difficulty")
      .single();

    if (updateError) throw updateError;

    const payload = {
      room: updatedRoom,
      gameMode,
      roundNumber,
      difficulty,
      questions: questionsBySide,
      durationSeconds: ROUND_DURATION_SECONDS,
      startedAt: Date.now(),
    };

    await broadcastRoomEvent(code, "round-start", payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("start round failed", error);
    return NextResponse.json({ error: "Gagal memulai ronde." }, { status: 500 });
  }
}
