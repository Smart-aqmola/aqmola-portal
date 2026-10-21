/**
 * Demo stand-in for the SMS one-time code (spec 2.1, 2.2). No message is sent: the code is fixed
 * and the screen says so. The backend replaces this with a real SMS service and a short lifetime.
 */
export const DEMO_CODE = "123456";
export const CODE_LENGTH = DEMO_CODE.length;

/** Spaces and dashes are ignored, so "123 456" works. */
export function isCodeCorrect(input: string): boolean {
  return input.replace(/[\s-]/g, "") === DEMO_CODE;
}
