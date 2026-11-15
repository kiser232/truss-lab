"use client";

import { useSyncExternalStore } from "react";
import type { Ask } from "./exams";
import type { Model } from "./types";

export type WrongNote = {
  key: string;
  source: string;
  prompt: string;
  picked: string;
  answer: string;
  choices: string[];
  at: number;
};

export type MadeProblem = {
  id: string;
  prompt: string;
  model: Model;
  ask: Ask;
  at: number;
};

export type TipPost = {
  id: string;
  title: string;
  body: string;
  at: number;
};

const WRONGS = "truss-lab-wrongs";
const MADE = "truss-lab-problems";
const TIPS = "truss-lab-tips";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("truss-lab"));
}

const NO_WRONGS: WrongNote[] = [];
const NO_MADE: MadeProblem[] = [];
const NO_TIPS: TipPost[] = [];
let wrongSnap: WrongNote[] = NO_WRONGS;
let madeSnap: MadeProblem[] = NO_MADE;
let tipSnap: TipPost[] = NO_TIPS;
let snapsReady = false;

function byRecent<T extends { at: number }>(items: T[]) {
  return [...items].sort((a, b) => b.at - a.at);
}

function loadSnaps() {
  if (snapsReady || typeof window === "undefined") return;
  const wrongs = byRecent(readJson<WrongNote[]>(WRONGS, []));
  const made = byRecent(readJson<MadeProblem[]>(MADE, []));
  const tips = byRecent(readJson<TipPost[]>(TIPS, []));
  wrongSnap = wrongs.length ? wrongs : NO_WRONGS;
  madeSnap = made.length ? made : NO_MADE;
  tipSnap = tips.length ? tips : NO_TIPS;
  snapsReady = true;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("truss-lab", onStoreChange);
  return () => window.removeEventListener("truss-lab", onStoreChange);
}

export function useWrongs() {
  return useSyncExternalStore(subscribe, () => (loadSnaps(), wrongSnap), () => NO_WRONGS);
}

export function useMade() {
  return useSyncExternalStore(subscribe, () => (loadSnaps(), madeSnap), () => NO_MADE);
}

export function useTips() {
  return useSyncExternalStore(subscribe, () => (loadSnaps(), tipSnap), () => NO_TIPS);
}

export function readWrongs() {
  loadSnaps();
  return wrongSnap;
}

export function rememberWrong(note: Omit<WrongNote, "at">) {
  const next = readWrongs().filter((item) => item.key !== note.key);
  next.unshift({ ...note, at: Date.now() });
  wrongSnap = next;
  writeJson(WRONGS, next);
}

export function gradeAnswer(input: { key: string; source: string; prompt: string; choices: { text: string; ok: boolean }[]; picked: number }) {
  const answer = input.choices.find((choice) => choice.ok)?.text ?? "";
  const picked = input.choices[input.picked]?.text ?? "";
  if (input.choices[input.picked]?.ok) forgetWrong(input.key);
  else {
    rememberWrong({
      key: input.key,
      source: input.source,
      prompt: input.prompt,
      picked,
      answer,
      choices: input.choices.map((choice) => choice.text),
    });
  }
}

export function forgetWrong(key: string) {
  const next = readWrongs().filter((item) => item.key !== key);
  wrongSnap = next.length ? next : NO_WRONGS;
  writeJson(WRONGS, wrongSnap);
}

export function readMade() {
  loadSnaps();
  return madeSnap;
}

export function saveMade(problem: MadeProblem) {
  const next = readMade().filter((item) => item.id !== problem.id);
  next.unshift(problem);
  madeSnap = next;
  writeJson(MADE, next);
}

export function removeMade(id: string) {
  const next = readMade().filter((item) => item.id !== id);
  madeSnap = next.length ? next : NO_MADE;
  writeJson(MADE, madeSnap);
}

export function readTips() {
  loadSnaps();
  return tipSnap;
}

export function saveTip(post: TipPost) {
  const next = readTips().filter((item) => item.id !== post.id);
  next.unshift(post);
  tipSnap = next;
  writeJson(TIPS, next);
}

export function removeTip(id: string) {
  const next = readTips().filter((item) => item.id !== id);
  tipSnap = next.length ? next : NO_TIPS;
  writeJson(TIPS, tipSnap);
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("truss-lab", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction("files", mode);
        const request = run(tx.objectStore("files"));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function saveFile(key: string, blob: Blob) {
  return idb("readwrite", (store) => store.put(blob, key));
}

export function loadFile(key: string) {
  return idb<Blob | undefined>("readonly", (store) => store.get(key));
}

export function removeFile(key: string) {
  return idb("readwrite", (store) => store.delete(key));
}

export type StoredPhoto = { id: string; typeId: string; blob: Blob };

export function savePhoto(typeId: string, blob: Blob) {
  const id = `${typeId}:${Date.now()}`;
  return idb("readwrite", (store) => store.put({ id, typeId, blob } satisfies StoredPhoto, `photo:${id}`)).then(() => id);
}

export function loadPhotos(typeId: string) {
  return openDb().then(
    (db) =>
      new Promise<StoredPhoto[]>((resolve, reject) => {
        const tx = db.transaction("files", "readonly");
        const request = tx.objectStore("files").getAll();
        request.onsuccess = () => {
          const rows = (request.result as unknown[]).filter((row): row is StoredPhoto => {
            return Boolean(row && typeof row === "object" && "typeId" in row && (row as StoredPhoto).typeId === typeId);
          });
          resolve(rows);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}
