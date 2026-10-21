import { isValidIinShape } from "./iin";
import { normalizePhone } from "./phone";

/** A registered resident (spec 2.1). Physical persons only; business uses the demo profile for now. */
export type Profile = {
  id: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  iin: string;
  /** Always in the form +77011234567. */
  phone: string;
  email?: string;
  createdAt: string;
};

export type RegistrationInput = {
  lastName: string;
  firstName: string;
  middleName: string;
  iin: string;
  phone: string;
  email: string;
  /** Agreement to process personal data (spec 19.3). */
  consent: boolean;
};

export type RegistrationField = keyof RegistrationInput;
/** `required` | `format` | `long` | `taken`: the form turns the code into a text in the person's language. */
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export const MAX_NAME = 60;
export const MAX_EMAIL = 100;

const NAME = /^[\p{L}][\p{L}\s'’-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkName(value: string, optional = false): string | undefined {
  const text = value.trim();
  if (!text) return optional ? undefined : "required";
  if (text.length > MAX_NAME) return "long";
  return NAME.test(text) ? undefined : "format";
}

/** Checks the registration form. An empty result means it can go on to the code step. */
export function validateRegistration(
  input: RegistrationInput,
  existing: readonly Profile[],
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  const lastName = checkName(input.lastName);
  if (lastName) errors.lastName = lastName;
  const firstName = checkName(input.firstName);
  if (firstName) errors.firstName = firstName;
  const middleName = checkName(input.middleName, true);
  if (middleName) errors.middleName = middleName;

  const iin = input.iin.replace(/\s/g, "");
  if (!iin) errors.iin = "required";
  else if (!isValidIinShape(iin)) errors.iin = "format";
  else if (existing.some((profile) => profile.iin === iin)) errors.iin = "taken";

  const phone = input.phone.trim() ? normalizePhone(input.phone) : null;
  if (!input.phone.trim()) errors.phone = "required";
  else if (!phone) errors.phone = "format";
  else if (existing.some((profile) => profile.phone === phone)) errors.phone = "taken";

  const email = input.email.trim();
  if (email.length > MAX_EMAIL) errors.email = "long";
  else if (email && !EMAIL.test(email)) errors.email = "format";

  if (!input.consent) errors.consent = "required";
  return errors;
}

/** Builds the profile from a form that already passed `validateRegistration`. */
export function createProfile(input: RegistrationInput, id: string, now: Date): Profile {
  const middleName = input.middleName.trim();
  const email = input.email.trim();
  return {
    id,
    lastName: input.lastName.trim(),
    firstName: input.firstName.trim(),
    ...(middleName ? { middleName } : {}),
    iin: input.iin.replace(/\s/g, ""),
    phone: normalizePhone(input.phone) ?? input.phone,
    ...(email ? { email } : {}),
    createdAt: now.toISOString(),
  };
}

/** "Иванов Иван": how the person is named in the header and in applications. */
export function displayName(profile: Pick<Profile, "lastName" | "firstName">): string {
  return `${profile.lastName} ${profile.firstName}`;
}

/** Finds the person who signs in with this phone number, whatever the way it was typed. */
export function findByPhone(profiles: readonly Profile[], phoneInput: string): Profile | null {
  const phone = normalizePhone(phoneInput);
  if (!phone) return null;
  return profiles.find((profile) => profile.phone === phone) ?? null;
}
