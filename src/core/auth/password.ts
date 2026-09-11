import bcrypt from "bcryptjs";

export function sifreyiHashle(duzMetin: string): Promise<string> {
  return bcrypt.hash(duzMetin, 12);
}

export function sifreDogrula(duzMetin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(duzMetin, hash);
}
