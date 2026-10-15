import Link from "next/link";

const games = [
  ["01", "Tug of War", "Jawaban benar menghasilkan power. Tarik marker sampai ±10 atau unggul saat ronde berakhir."],
  ["02", "Math Racing", "Akurasi menggerakkan kart. Jika sama-sama finis, response time menjadi pembeda."],
  ["03", "Boss Battle", "Kerja sama mengurangi HP boss. Dua jawaban benar sekaligus memicu combo attack."],
  ["04", "Bomb Defuse", "Final co-op mission: kumpulkan progress sebelum strike atau batas ronde habis."],
] as const;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">LEVELUP MATH ARENA</p>
        <h1>Math practice that feels like a game.</h1>
        <p className="lead">
          Empat arena dalam satu sesi. Bermain multiplayer dari device berbeda, host bisa ikut menjadi pemain,
          atau latihan melawan computer Easy, Medium, dan Hard. Soal tetap menyesuaikan kelas masing-masing.
        </p>
        <div className="actions">
          <Link className="button primary" href="/host">Create Arena</Link>
          <Link className="button secondary" href="/join">Join Room</Link>
        </div>
        <div className="setupSummary" style={{ marginTop: 18 }}>
          <span className="infoChip">Realtime multiplayer</span>
          <span className="infoChip">Host can play</span>
          <span className="infoChip">VS Computer</span>
          <span className="infoChip">Responsive</span>
          <span className="infoChip">Learning analytics</span>
        </div>
      </section>

      <section className="gameGrid" aria-label="Daftar game">
        {games.map(([number, title, description]) => (
          <article className="gameCard" key={title}>
            <span>{number}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <p className="eyebrow">HOW IT WORKS</p>
        <div className="setupSummary">
          <span className="infoChip">1 · Host creates room</span>
          <span className="infoChip">2 · Players join</span>
          <span className="infoChip">3 · Solve simultaneously</span>
          <span className="infoChip">4 · Game state moves</span>
          <span className="infoChip">5 · Review learning results</span>
        </div>
      </section>
    </main>
  );
}
