import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { tokenMatches } from "@/src/lib/tokens";

type TopicBucket = { attempts: number; correct: number; totalResponseMs: number };

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const supabase = createSupabaseAdmin();
    const { data: room, error: roomError } = await supabase
      .from("arena_rooms")
      .select("id, host_token_hash, status")
      .eq("code", code)
      .single();
    if (roomError || !room) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });

    const hostToken = request.headers.get("x-host-token");
    const playerToken = request.headers.get("x-player-token");
    const requestedPlayerId = request.nextUrl.searchParams.get("playerId");
    const isHost = tokenMatches(hostToken, room.host_token_hash);

    const { data: players, error: playersError } = await supabase
      .from("arena_players")
      .select("id, display_name, grade_level, side, player_token_hash")
      .eq("room_id", room.id)
      .order("side");
    if (playersError) throw playersError;

    const requestingPlayer = players?.find((player) => player.id === requestedPlayerId) ?? null;
    const isPlayer = Boolean(requestingPlayer && tokenMatches(playerToken, requestingPlayer.player_token_hash));
    if (!isHost && !isPlayer) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });

    const visiblePlayers = isHost ? (players ?? []) : requestingPlayer ? [requestingPlayer] : [];
    const visibleIds = new Set(visiblePlayers.map((player) => player.id));

    const { data: answers, error: answersError } = await supabase
      .from("arena_answers")
      .select("player_id, question_id, game_mode, is_correct, response_time_ms")
      .eq("room_id", room.id);
    if (answersError) throw answersError;

    const relevantAnswers = (answers ?? []).filter((answer) => visibleIds.has(answer.player_id));
    const questionIds = [...new Set(relevantAnswers.map((answer) => answer.question_id))];
    const { data: questions, error: questionsError } = questionIds.length
      ? await supabase.from("arena_questions").select("id, topic, subtopic").in("id", questionIds)
      : { data: [], error: null };
    if (questionsError) throw questionsError;

    const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));

    const results = visiblePlayers.map((player) => {
      const playerAnswers = relevantAnswers.filter((answer) => answer.player_id === player.id);
      const correct = playerAnswers.filter((answer) => answer.is_correct).length;
      const avgResponseMs = playerAnswers.length
        ? Math.round(playerAnswers.reduce((sum, answer) => sum + answer.response_time_ms, 0) / playerAnswers.length)
        : 0;
      const topics = new Map<string, TopicBucket>();

      playerAnswers.forEach((answer) => {
        const question = questionMap.get(answer.question_id);
        const topic = question?.topic ?? "Lainnya";
        const bucket = topics.get(topic) ?? { attempts: 0, correct: 0, totalResponseMs: 0 };
        bucket.attempts += 1;
        bucket.correct += answer.is_correct ? 1 : 0;
        bucket.totalResponseMs += answer.response_time_ms;
        topics.set(topic, bucket);
      });

      const topicStats = [...topics.entries()].map(([topic, bucket]) => ({
        topic,
        attempts: bucket.attempts,
        correct: bucket.correct,
        accuracy: bucket.attempts ? Math.round((bucket.correct / bucket.attempts) * 100) : 0,
        avgResponseMs: bucket.attempts ? Math.round(bucket.totalResponseMs / bucket.attempts) : 0,
      })).sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts);

      return {
        id: player.id,
        displayName: player.display_name,
        gradeLevel: player.grade_level,
        side: player.side,
        totalQuestions: playerAnswers.length,
        correct,
        accuracy: playerAnswers.length ? Math.round((correct / playerAnswers.length) * 100) : 0,
        avgResponseMs,
        strongestTopic: topicStats[0]?.topic ?? null,
        needsPractice: topicStats.length ? topicStats[topicStats.length - 1].topic : null,
        topicStats,
      };
    });

    return NextResponse.json({ status: room.status, results });
  } catch (error) {
    console.error("results failed", error);
    return NextResponse.json({ error: "Gagal menghitung hasil belajar." }, { status: 500 });
  }
}
