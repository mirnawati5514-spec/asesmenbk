import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Heart,
  Lightbulb,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Download,
  UserRound,
  UsersRound,
} from "lucide-react";
import { db } from "./db";

const traits = [
  {
    id: "honesty",
    name: "Kejujuran",
    shortName: "Jujur",
    description: "Berkata dan bertindak sesuai kenyataan",
    icon: ShieldCheck,
    tip: "Berikan apresiasi saat siswa berani berkata jujur, termasuk ketika mengakui kekeliruan. Bangun suasana aman agar ia tidak takut menyampaikan kebenaran.",
  },
  {
    id: "responsibility",
    name: "Tanggung jawab",
    shortName: "Tanggung jawab",
    description: "Menuntaskan tugas dan menjaga kepercayaan",
    icon: ClipboardCheck,
    tip: "Mulai dengan satu tanggung jawab kecil yang jelas. Gunakan daftar cek harian dan refleksi singkat untuk membantu siswa menuntaskan tugas secara mandiri.",
  },
  {
    id: "discipline",
    name: "Disiplin",
    shortName: "Disiplin",
    description: "Mengelola waktu dan mengikuti kesepakatan",
    icon: CheckCircle2,
    tip: "Susun rutinitas pagi dan jadwal belajar bersama siswa. Sepakati pengingat yang sederhana, lalu evaluasi kemajuannya tanpa membandingkan dengan teman.",
  },
  {
    id: "courtesy",
    name: "Sopan santun",
    shortName: "Sopan santun",
    description: "Menghargai orang lain melalui sikap dan tutur kata",
    icon: Heart,
    tip: "Latih melalui bermain peran: menyapa, mendengarkan, dan menyampaikan pendapat dengan santun. Orang dewasa dapat memberi contoh dan penguatan secara langsung.",
  },
  {
    id: "cooperation",
    name: "Kerja sama & kepedulian",
    shortName: "Peduli",
    description: "Berkontribusi dan peka terhadap kebutuhan sekitar",
    icon: UsersRound,
    tip: "Libatkan siswa dalam tugas kelompok dengan peran yang bergilir. Ajak ia melakukan satu aksi kepedulian sederhana, lalu bicarakan dampak baik yang dirasakan.",
  },
  {
    id: "independence",
    name: "Percaya diri & kemandirian",
    shortName: "Mandiri",
    description: "Berani mencoba dan mengambil keputusan sesuai usia",
    icon: Sparkles,
    tip: "Tawarkan pilihan sederhana, beri waktu untuk mencoba sebelum membantu, dan hargai usaha maupun keberanian mengambil langkah—bukan hanya hasil akhirnya.",
  },
];

const ratingOptions = [
  { value: "always", label: "Selalu", score: 4 },
  { value: "often", label: "Sering", score: 3 },
  { value: "sometimes", label: "Kadang", score: 2 },
  { value: "rarely", label: "Jarang", score: 1 },
];

const emptyObservations = () =>
  Object.fromEntries(traits.map((trait) => [trait.id, { rating: "", note: "" }]));

const emptyStudent = () => ({
  name: "",
  className: "",
  observations: emptyObservations(),
});

function getLevel(rating) {
  if (rating === "always" || rating === "often") return "strong";
  if (rating === "sometimes") return "developing";
  if (rating === "rarely") return "attention";
  return "empty";
}

function getRatingLabel(rating) {
  return ratingOptions.find((option) => option.value === rating)?.label ?? "Belum dinilai";
}

function normalizeStudent(student) {
  return {
    ...emptyStudent(),
    ...student,
    observations: {
      ...emptyObservations(),
      ...(student?.observations ?? {}),
    },
  };
}

function App() {
  const [students, setStudents] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const importFileRef = useRef(null);

  async function refreshStudents(preferredId) {
    const records = await db.students.orderBy("updatedAt").reverse().toArray();
    setStudents(records);
    if (preferredId != null) {
      const selected = records.find((student) => student.id === preferredId);
      if (selected) {
        setCurrentId(selected.id);
        setForm(normalizeStudent(selected));
        setIsDirty(false);
      }
    }
  }

  useEffect(() => {
    let active = true;
    db.students
      .orderBy("updatedAt")
      .reverse()
      .toArray()
      .then((records) => {
        if (!active) return;
        setStudents(records);
        if (records.length > 0) {
          setCurrentId(records[0].id);
          setForm(normalizeStudent(records[0]));
        }
      })
      .catch((error) => {
        console.error("Gagal memuat data siswa dari IndexedDB.", error);
        setNotice("Data belum dapat dimuat. Coba muat ulang halaman.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeExit = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [isDirty]);

  const ratedTraits = useMemo(
    () => traits.filter((trait) => form.observations[trait.id]?.rating),
    [form.observations],
  );
  const strengths = ratedTraits.filter(
    (trait) => getLevel(form.observations[trait.id].rating) === "strong",
  );
  const priorities = ratedTraits.filter(
    (trait) => getLevel(form.observations[trait.id].rating) !== "strong",
  );
  const completedCount = ratedTraits.length;
  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.className}`.toLowerCase().includes(query.toLowerCase()),
  );

  function updateObservation(traitId, field, value) {
    setForm((current) => ({
      ...current,
      observations: {
        ...current.observations,
        [traitId]: {
          ...current.observations[traitId],
          [field]: value,
        },
      },
    }));
    setIsDirty(true);
    setNotice("");
  }

  function startNewStudent() {
    if (isDirty && !window.confirm("Perubahan yang belum disimpan akan hilang. Buat profil baru?")) return;
    setCurrentId(null);
    setForm(emptyStudent());
    setIsDirty(false);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectStudent(student) {
    if (isDirty && !window.confirm("Perubahan yang belum disimpan akan hilang. Pindah ke profil ini?")) return;
    setCurrentId(student.id);
    setForm(normalizeStudent(student));
    setIsDirty(false);
    setNotice("");
  }

  async function saveStudent(event) {
    event.preventDefault();
    const name = form.name.trim();
    const className = form.className.trim();
    if (!name || !className) {
      setNotice("Nama siswa dan kelas perlu diisi sebelum menyimpan profil.");
      return;
    }
    if (completedCount === 0) {
      setNotice("Isi minimal satu hasil pengamatan sebelum menyimpan profil.");
      return;
    }

    const record = { ...form, name, className, updatedAt: new Date().toISOString() };
    try {
      let id;
      if (currentId) {
        await db.students.put({ ...record, id: currentId });
        id = currentId;
      } else {
        id = await db.students.add(record);
      }
      await refreshStudents(id);
      setIsDirty(false);
      setNotice("Profil tersimpan di perangkat ini.");
    } catch (error) {
      console.error("Gagal menyimpan profil siswa ke IndexedDB.", error);
      setNotice("Profil belum tersimpan. Periksa ruang penyimpanan lalu coba lagi.");
    }
  }

  async function deleteStudent() {
    const selected = students.find((student) => student.id === currentId);
    if (!selected) return;
    if (!window.confirm(`Hapus profil ${selected.name}? Data pengamatan pada perangkat ini akan dihapus.`)) return;
    try {
      await db.students.delete(currentId);
      const remaining = await db.students.orderBy("updatedAt").reverse().toArray();
      setStudents(remaining);
      setCurrentId(remaining[0]?.id ?? null);
      setForm(remaining[0] ? normalizeStudent(remaining[0]) : emptyStudent());
      setIsDirty(false);
      setNotice("Profil berhasil dihapus dari perangkat ini.");
    } catch (error) {
      console.error("Gagal menghapus profil siswa dari IndexedDB.", error);
      setNotice("Profil belum terhapus. Coba lagi.");
    }
  }

  async function exportBackup() {
    try {
      const records = await db.students.toArray();
      const backup = {
        app: "pendar-karakter-siswa",
        version: 1,
        exportedAt: new Date().toISOString(),
        students: records,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `pendar-cadangan-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`Cadangan ${records.length} profil berhasil diunduh.`);
    } catch (error) {
      console.error("Gagal mengekspor cadangan profil siswa.", error);
      setNotice("Cadangan belum dapat dibuat. Coba lagi.");
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isDirty && !window.confirm("Perubahan yang belum disimpan akan hilang saat memulihkan cadangan. Lanjutkan?")) {
      event.target.value = "";
      return;
    }
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.app !== "pendar-karakter-siswa" || backup?.version !== 1 || !Array.isArray(backup.students)) {
        throw new Error("Format cadangan tidak dikenali.");
      }
      const validStudents = backup.students.filter((student) =>
        student && typeof student.name === "string" && typeof student.className === "string" && student.observations && typeof student.observations === "object",
      );
      if (!validStudents.length) {
        setNotice("File cadangan tidak berisi profil yang valid.");
        return;
      }
      const imported = validStudents.map((student) => {
        const { id, ...record } = student;
        return { ...normalizeStudent(record), updatedAt: record.updatedAt || new Date().toISOString() };
      });
      await db.students.bulkAdd(imported);
      const records = await db.students.orderBy("updatedAt").reverse().toArray();
      setStudents(records);
      setCurrentId(records[0].id);
      setForm(normalizeStudent(records[0]));
      setIsDirty(false);
      setNotice(`${imported.length} profil berhasil dipulihkan. Profil yang ada tetap tersimpan.`);
    } catch (error) {
      console.error("Gagal mengimpor cadangan profil siswa.", error);
      setNotice("File tidak dapat dipulihkan. Pastikan file berasal dari Pendar dan belum rusak.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Pendar, beranda">
          <span className="brand-mark"><Sparkles size={19} strokeWidth={2.4} /></span>
          <span className="brand-name">pendar<span>.</span></span>
        </a>

        <div className="workspace-label">RUANG KONSELING</div>
        <button className="nav-item nav-item-active" type="button">
          <span className="nav-icon"><BookOpen size={17} /></span>
          Peta karakter
          <span className="nav-active-indicator" />
        </button>
        <div className="side-divider" />

        <div className="student-list-heading">
          <span>PROFIL SISWA</span>
          <button
            className="icon-button small-icon-button"
            type="button"
            onClick={startNewStudent}
            aria-label="Tambah profil siswa"
            title="Tambah profil siswa"
          >
            <Plus size={16} />
          </button>
        </div>
        <label className="search-box">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama siswa..."
            aria-label="Cari profil siswa"
          />
        </label>
        <div className="student-list">
          {loading ? (
            <div className="sidebar-empty">Memuat profil...</div>
          ) : filteredStudents.length ? (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                className={`student-row ${currentId === student.id ? "student-row-active" : ""}`}
                type="button"
                onClick={() => selectStudent(student)}
              >
                <span className="avatar">{student.name.trim().charAt(0).toUpperCase()}</span>
                <span className="student-row-copy">
                  <strong>{student.name}</strong>
                  <span>Kelas {student.className}</span>
                </span>
                {currentId === student.id && <span className="selected-dot" />}
              </button>
            ))
          ) : (
            <div className="sidebar-empty">
              {students.length ? "Siswa tidak ditemukan." : "Profil yang disimpan akan muncul di sini."}
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-icon"><ShieldCheck size={17} /></span>
            <div>
              <strong>Aman & privat</strong>
              <p>Data tersimpan hanya di perangkat ini.</p>
            </div>
          </div>
          <div className="counselor-profile">
            <span className="counselor-avatar"><UserRound size={17} /></span>
            <span><strong>Ruang Guru BK</strong><small>Pendamping siswa</small></span>
            <ChevronDown size={15} className="profile-chevron" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Konseling</span><span className="breadcrumb-slash">/</span><strong>Peta karakter</strong></div>
          <div className="topbar-right"><span className={`save-indicator ${isDirty ? "save-indicator-dirty" : ""}`}><span /> {isDirty ? "Perubahan belum disimpan" : "Tersimpan di perangkat"}</span></div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> PENDAMPINGAN SISWA</div>
              <h1>Peta karakter <span>siswa</span></h1>
              <p>Kenali kekuatan, tumbuhkan potensi. Setiap anak punya cahaya yang bisa dibantu bersinar.</p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary backup-button" type="button" onClick={() => importFileRef.current?.click()}>
                <Upload size={15} /> Pulihkan
              </button>
              <input ref={importFileRef} className="sr-only" type="file" accept="application/json,.json" onChange={importBackup} aria-label="Pilih file cadangan Pendar" />
              <button className="button button-secondary backup-button" type="button" onClick={exportBackup}>
                <Download size={15} /> Cadangkan
              </button>
              <button className="button button-secondary new-profile-button" type="button" onClick={startNewStudent}>
                <Plus size={17} /> Profil baru
              </button>
            </div>
          </section>

          <form onSubmit={saveStudent}>
            <section className="student-card panel">
              <div className="section-kicker"><span className="section-number">01</span><span>IDENTITAS SISWA</span></div>
              <div className="identity-grid">
                <label className="field">
                  <span>Nama siswa <span className="required-mark">*</span></span>
                  <input
                    value={form.name}
                    onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setIsDirty(true); }}
                    placeholder="Contoh: Alya Putri"
                    autoComplete="off"
                  />
                </label>
                <label className="field">
                  <span>Kelas <span className="required-mark">*</span></span>
                  <input
                    value={form.className}
                    onChange={(event) => { setForm((current) => ({ ...current, className: event.target.value })); setIsDirty(true); }}
                    placeholder="Contoh: VII A"
                    autoComplete="off"
                  />
                </label>
                <div className="observation-progress">
                  <div className="progress-label"><span>Kelengkapan pengamatan</span><strong>{completedCount}<span> / 6</span></strong></div>
                  <div className="progress-track"><span style={{ width: `${(completedCount / traits.length) * 100}%` }} /></div>
                  <span className="progress-caption">{completedCount === 6 ? "Semua aspek sudah dinilai" : "Isi aspek yang sudah diamati"}</span>
                </div>
              </div>
            </section>

            <section className="map-section">
              <div className="section-heading">
                <div>
                  <div className="section-kicker"><span className="section-number">02</span><span>PETA PROFIL KARAKTER</span></div>
                  <h2>Bagaimana karakter berkembang?</h2>
                  <p>Pilih hasil pengamatan untuk melihat gambaran yang utuh dan seimbang.</p>
                </div>
                <div className="legend-wrap">
                  <div className="legend">
                    <span><i className="legend-dot legend-green" />Kuat</span>
                    <span><i className="legend-dot legend-yellow" />Berkembang</span>
                    <span><i className="legend-dot legend-red" />Perlu perhatian</span>
                  </div>
                  <span className="rating-hint">Selalu/Sering → Kuat · Kadang → Berkembang · Jarang → Perlu perhatian</span>
                </div>
              </div>

              <div className="trait-grid">
                {traits.map((trait, index) => {
                  const Icon = trait.icon;
                  const rating = form.observations[trait.id]?.rating ?? "";
                  const level = getLevel(rating);
                  return (
                    <article className={`trait-card trait-${level}`} key={trait.id}>
                      <div className="trait-topline">
                        <span className="trait-icon"><Icon size={18} strokeWidth={1.9} /></span>
                        <span className="trait-index">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <h3>{trait.name}</h3>
                      <p>{trait.description}</p>
                      <label className="rating-field">
                        <span className="sr-only">Penilaian {trait.name}</span>
                        <select
                          value={rating}
                          onChange={(event) => updateObservation(trait.id, "rating", event.target.value)}
                          aria-label={`Penilaian ${trait.name}`}
                        >
                          <option value="">Pilih pengamatan</option>
                          {ratingOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={15} />
                      </label>
                      <label className="note-field">
                        <span className="sr-only">Catatan {trait.name}</span>
                        <input
                          value={form.observations[trait.id]?.note ?? ""}
                          onChange={(event) => updateObservation(trait.id, "note", event.target.value)}
                          placeholder="Catatan pengamatan (opsional)"
                          aria-label={`Catatan pengamatan ${trait.name}`}
                        />
                      </label>
                      <div className="trait-status">
                        <i className={`status-dot status-${level}`} />
                        <span>{level === "empty" ? "Menunggu pengamatan" : level === "strong" ? "Kuat" : level === "developing" ? "Berkembang" : "Perlu perhatian"}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="insight-section">
              <div className="section-heading insight-heading">
                <div>
                  <div className="section-kicker"><span className="section-number">03</span><span>RINGKASAN & ARAH BIMBINGAN</span></div>
                  <h2>Langkah kecil, dampak bermakna</h2>
                  <p>Gunakan hasil ini sebagai awal percakapan yang mendukung, bukan label bagi siswa.</p>
                </div>
                {completedCount > 0 && <span className="summary-count">{completedCount} aspek teramati</span>}
              </div>

              {completedCount ? (
                <>
                  <div className="summary-grid">
                    <article className="summary-card summary-strength">
                      <div className="summary-title"><span className="summary-icon"><Star size={17} /></span><h3>Kelebihan utama</h3></div>
                      {strengths.length ? (
                        <ul className="insight-list">
                          {strengths.map((trait) => (
                            <li key={trait.id}>
                              <span className="insight-check"><Check size={13} /></span>
                              <span><strong>{trait.name}</strong><small>{form.observations[trait.id].note || `Teramati ${getRatingLabel(form.observations[trait.id].rating).toLowerCase()}; pertahankan dan beri ruang untuk berkembang.`}</small></span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="summary-empty">Kekuatan akan terlihat saat ada aspek yang dinilai “Selalu” atau “Sering”.</p>}
                    </article>
                    <article className="summary-card summary-growth">
                      <div className="summary-title"><span className="summary-icon"><ArrowDown size={17} /></span><h3>Aspek prioritas</h3></div>
                      {priorities.length ? (
                        <ul className="insight-list">
                          {priorities.map((trait) => (
                            <li key={trait.id}>
                              <span className={`priority-bullet priority-${getLevel(form.observations[trait.id].rating)}`} />
                              <span><strong>{trait.name} <em>{getRatingLabel(form.observations[trait.id].rating)}</em></strong><small>{form.observations[trait.id].note || "Dapat ditumbuhkan melalui dukungan dan latihan yang konsisten."}</small></span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="summary-empty">Belum ada aspek prioritas. Terus dukung perkembangan positif siswa.</p>}
                    </article>
                  </div>

                  <article className="guidance-card">
                    <div className="guidance-head">
                      <span className="guidance-icon"><Lightbulb size={19} /></span>
                      <div><span className="guidance-label">SARAN PROGRAM BIMBINGAN</span><h3>Praktis untuk dilakukan bersama</h3></div>
                    </div>
                    {priorities.length ? (
                      <div className="guidance-list">
                        {priorities.map((trait, index) => (
                          <div className="guidance-item" key={trait.id}>
                            <span className="guidance-number">{String(index + 1).padStart(2, "0")}</span>
                            <div><strong>{trait.name}</strong><p>{trait.tip}</p></div>
                            <span className="guidance-timing">{index === 0 ? "Minggu ini" : "Bertahap"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="positive-guidance">
                        <span className="positive-check"><Check size={14} /></span>
                        <p>Pertahankan kebiasaan baik dengan apresiasi yang spesifik. Ajak siswa berbagi cara ia mengembangkan sikap positifnya agar menjadi inspirasi bagi teman.</p>
                      </div>
                    )}
                    <div className="counseling-note"><Heart size={14} /><span>Bangun dialog hangat, fokus pada usaha, dan libatkan siswa serta orang tua dalam menentukan langkah berikutnya.</span></div>
                  </article>
                </>
              ) : (
                <div className="empty-insight panel">
                  <span className="empty-insight-icon"><Lightbulb size={20} /></span>
                  <div><strong>Peta perkembangan akan muncul di sini</strong><p>Pilih hasil pengamatan pada satu atau lebih aspek karakter untuk melihat kelebihan dan saran pendampingan yang sesuai.</p></div>
                  <ArrowRight size={17} className="empty-insight-arrow" />
                </div>
              )}
            </section>

            <div className="form-footer">
              <div className={`form-notice ${notice ? "form-notice-visible" : ""}`} role="status" aria-live="polite">
                {notice && <><CheckCircle2 size={16} /><span>{notice}</span></>}
              </div>
              {currentId && <button className="button button-danger" type="button" onClick={deleteStudent}>
                <Trash2 size={15} /> Hapus profil
              </button>}
              <button className="button button-primary" type="submit">
                <Save size={16} /> Simpan profil <ArrowRight size={16} />
              </button>
            </div>
          </form>

          <footer className="page-footer">
            <span><Sparkles size={13} /> Setiap anak bertumbuh dengan waktunya sendiri.</span>
            <span>Data tersimpan secara lokal di perangkat ini.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
