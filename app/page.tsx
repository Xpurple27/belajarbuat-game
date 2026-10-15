import Link from "next/link";

const games = [
  ["01", "Tug of War", "Adu power jawaban sampai salah satu sisi mencapai 10."],
  ["02", "Math Racing", "Jawaban benar menggerakkan karakter menuju garis finish."],
  ["03", "Boss Battle", "Dua pemain bekerja sama mengalahkan boss dengan damage matematika."],
  ["04", "Bomb Defuse", "Jawaban benar membuka clue untuk menjinakkan bom."],
] as const;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">LEVELUP MATH ARENA · MVP</p>
        <h1>Belajar matematika lewat battle 2D yang dikontrol guru.</h1>
        <p className="lead">
          Satu host membuat room. Dua siswa dari jenjang berbeda masuk dari perangkat masing-masing,
          menerima soal yang sesuai level mereka, lalu bermain dalam state game yang sama.
        </p>
        <div className="actions">
          <Link className="button primary" href="/host">Buka Host</Link>
          <Link className="button" href="/join">Join sebagai Player</Link>
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
    </main>
  );
}
