import Dexie from "dexie";

export const db = new Dexie("pendar-karakter-siswa");

db.version(1).stores({
  students: "++id, name, className, updatedAt",
});
