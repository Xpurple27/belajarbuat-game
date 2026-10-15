insert into public.arena_questions
  (grade_level, topic, subtopic, difficulty, question_text, options, correct_answer, explanation, estimated_time_seconds, power_value)
select * from (values
  (4,'Operasi Hitung','Penjumlahan','easy','245 + 378 = ...','["A. 613","B. 623","C. 633","D. 643"]'::jsonb,'B','245 + 378 = 623.',40,1),
  (4,'Operasi Hitung','Perkalian','easy','36 × 7 = ...','["A. 242","B. 252","C. 262","D. 272"]'::jsonb,'B','36 × 7 = 252.',40,1),
  (4,'Operasi Hitung','Pembagian','medium','864 ÷ 8 = ...','["A. 98","B. 108","C. 118","D. 128"]'::jsonb,'B','864 ÷ 8 = 108.',50,2),
  (4,'Pecahan','Pecahan Senilai','medium','Pecahan yang senilai dengan 3/4 adalah ...','["A. 4/6","B. 6/8","C. 8/12","D. 9/16"]'::jsonb,'B','3/4 × 2/2 = 6/8.',50,2),
  (4,'Geometri','Keliling Persegi Panjang','medium','Sebuah persegi panjang panjangnya 12 cm dan lebarnya 7 cm. Kelilingnya adalah ...','["A. 19 cm","B. 38 cm","C. 42 cm","D. 84 cm"]'::jsonb,'B','Keliling = 2(12 + 7) = 38 cm.',55,2),
  (4,'Geometri','Luas','hard','Sebuah lantai berbentuk persegi panjang berukuran 15 m × 8 m. Seperempat bagiannya ditutup karpet. Luas lantai yang tidak ditutup karpet adalah ...','["A. 30 m²","B. 60 m²","C. 90 m²","D. 120 m²"]'::jsonb,'C','Luas 120 m². Yang tidak tertutup = 3/4 × 120 = 90 m².',60,3),
  (4,'Soal Cerita','Operasi Campuran','hard','Rani memiliki 6 kotak pensil. Setiap kotak berisi 24 pensil. Ia memberikan 39 pensil kepada temannya. Sisa pensil Rani adalah ...','["A. 95","B. 105","C. 115","D. 125"]'::jsonb,'B','6 × 24 = 144, lalu 144 − 39 = 105.',60,3),
  (4,'Pecahan','Penjumlahan Pecahan','hard','Ibu menggunakan 1/4 kg gula untuk kue dan 2/8 kg untuk minuman. Total gula yang digunakan adalah ...','["A. 1/4 kg","B. 3/8 kg","C. 1/2 kg","D. 3/4 kg"]'::jsonb,'C','2/8 = 1/4 sehingga total = 1/4 + 1/4 = 1/2.',60,3),
  (7,'Bilangan','Bilangan Bulat','easy','Nilai dari −12 + 19 adalah ...','["A. −31","B. −7","C. 7","D. 31"]'::jsonb,'C','−12 + 19 = 7.',40,1),
  (7,'Aljabar','Substitusi','easy','Jika x = 5, nilai 3x + 4 adalah ...','["A. 15","B. 17","C. 19","D. 23"]'::jsonb,'C','3(5) + 4 = 19.',40,1),
  (7,'Aljabar','Persamaan Linear','medium','Jika 3x + 7 = 25, nilai x adalah ...','["A. 4","B. 5","C. 6","D. 7"]'::jsonb,'C','3x = 18 sehingga x = 6.',50,2),
  (7,'Perbandingan','Perbandingan Senilai','medium','Perbandingan buku Andi dan Budi adalah 3 : 5. Jika Andi memiliki 18 buku, banyak buku Budi adalah ...','["A. 24","B. 30","C. 35","D. 40"]'::jsonb,'B','18/3 = 6, sehingga 5 × 6 = 30.',55,2),
  (7,'Pecahan','Operasi Pecahan','medium','Hasil 2/3 + 1/4 adalah ...','["A. 3/7","B. 7/12","C. 11/12","D. 1"]'::jsonb,'C','2/3 = 8/12 dan 1/4 = 3/12, total 11/12.',55,2),
  (7,'Geometri','Luas Persegi Panjang','hard','Panjang persegi panjang adalah (x + 3) cm dan lebarnya (x − 1) cm. Jika x = 7, luasnya adalah ...','["A. 40 cm²","B. 50 cm²","C. 60 cm²","D. 70 cm²"]'::jsonb,'C','Panjang 10 cm, lebar 6 cm, luas 60 cm².',60,3),
  (7,'Aljabar','Model Matematika','hard','Tiga kali suatu bilangan dikurangi 5 sama dengan 28. Bilangan tersebut adalah ...','["A. 9","B. 10","C. 11","D. 12"]'::jsonb,'C','3x − 5 = 28 → 3x = 33 → x = 11.',60,3),
  (7,'Bilangan','Operasi Campuran','hard','Nilai dari 18 − 3 × (−4) + 8 ÷ 2 adalah ...','["A. 10","B. 26","C. 34","D. 46"]'::jsonb,'C','3×(−4)=−12 dan 8÷2=4, jadi 18−(−12)+4=34.',60,3)
) as q(grade_level,topic,subtopic,difficulty,question_text,options,correct_answer,explanation,estimated_time_seconds,power_value)
where not exists (
  select 1 from public.arena_questions aq where aq.question_text = q.question_text
);
