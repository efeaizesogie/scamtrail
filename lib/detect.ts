export type InputType = "HANDLE" | "EVM ADDRESS" | "CONTRACT" | "DOMAIN" | "PROJECT";

export type Detection =
  | { ok: true; type: InputType; value: string }
  | { ok: false; type: InputType | null; error: string };

const EVM = /^0x[a-fA-F0-9]{40}$/;
const HANDLE = /^@?[A-Za-z0-9_]{1,15}$/;
const DOMAIN = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,24}(:\d+)?([/?#]\S*)?$/i;
const X_URL = /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?(?:[?#]\S*)?$/i;

/** Classifies raw input. `hint` lets an example chip force CONTRACT for an address. */
export function detect(raw: string, hint?: InputType | null): Detection {
  const value = raw.trim();
  if (!value) return { ok: false, type: null, error: "Enter a handle, address, domain or project name." };

  const xUrl = value.match(X_URL);
  if (xUrl) return { ok: true, type: "HANDLE", value: `@${xUrl[1]}` };
  if (/^(https?:\/\/)?(www\.)?(x|twitter)\.com\/?$/i.test(value)) return { ok: false, type: "HANDLE", error: "Add the account name after x.com/, or type the handle with @." };
  if (/^0x/i.test(value)) {
    if (EVM.test(value)) return { ok: true, type: hint === "CONTRACT" ? "CONTRACT" : "EVM ADDRESS", value };
    const len = value.length - 2;
    return { ok: false, type: "EVM ADDRESS", error: `This address has ${len} characters after 0x. EVM addresses have 40.` };
  }
  if (value.startsWith("@")) {
    if (HANDLE.test(value)) return { ok: true, type: "HANDLE", value };
    return { ok: false, type: "HANDLE", error: "X handles use letters, numbers and underscores, up to 15 characters." };
  }
  if (DOMAIN.test(value)) return { ok: true, type: "DOMAIN", value };
  if (HANDLE.test(value) && !/\s/.test(value) && /_|\d/.test(value)) return { ok: true, type: "HANDLE", value };
  if (value.length < 2) return { ok: false, type: null, error: "Enter at least two characters." };
  return { ok: true, type: "PROJECT", value };
}

/** Fictional example values. None of these refer to a real project or account. */
export const EXAMPLES: { chip: string; value: string; type: InputType }[] = [
  { chip: "TRY AN X HANDLE", value: "@exampleproto", type: "HANDLE" },
  { chip: "TRY A CONTRACT", value: "0x5e1a0000000000000000000000000000000c0de1", type: "CONTRACT" },
  { chip: "TRY A WALLET", value: "0x7a11e70000000000000000000000000000000042", type: "EVM ADDRESS" },
  { chip: "TRY A DOMAIN", value: "app.example.com", type: "DOMAIN" },
];
