import { unstable_rethrow } from "next/navigation";

export type ActionState = { error?: string; ok?: string } | undefined;

/** Bungkus server action agar kesalahan tampil sebagai pesan di formulir, bukan halaman error. */
export function safeAction(fn: (fd: FormData) => Promise<ActionState | void>) {
  return async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
    try {
      return (await fn(fd)) ?? { ok: "Tersimpan." };
    } catch (e) {
      unstable_rethrow(e);
      console.error(e);
      return { error: e instanceof Error ? e.message : "Terjadi kesalahan." };
    }
  };
}
