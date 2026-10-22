import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDraftState } from "./use-draft-state";

type Form = { name: string; note: string };
const EMPTY: Form = { name: "", note: "" };
const isForm = (value: unknown): value is Form =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Form).name === "string" &&
  typeof (value as Form).note === "string";

function Probe({ id = "x" }: { id?: string }) {
  const [form, setForm, clear] = useDraftState(id, EMPTY, isForm);
  return (
    <div>
      <input
        aria-label="name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
      />
      <button onClick={clear}>clear</button>
      <output>{JSON.stringify(form)}</output>
    </div>
  );
}

const type = async (value: string) => {
  const input = screen.getByLabelText("name");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => window.sessionStorage.clear());

describe("useDraftState", () => {
  it("starts empty when there is no draft", () => {
    render(<Probe />);
    expect(screen.getByRole("status")).toHaveTextContent(JSON.stringify(EMPTY));
  });

  it("brings back what was typed when the form is built again", async () => {
    const first = render(<Probe />);
    await type("Иван");
    first.unmount();
    render(<Probe />);
    expect(await screen.findByDisplayValue("Иван")).toBeVisible();
  });

  it("keeps a draft for each key apart", async () => {
    const first = render(<Probe id="a" />);
    await type("A");
    first.unmount();
    render(<Probe id="b" />);
    expect(screen.getByLabelText("name")).toHaveValue("");
  });

  it("forgets the draft when the form is sent, and starts again from empty", async () => {
    const first = render(<Probe />);
    await type("Иван");
    await act(async () => screen.getByRole("button", { name: "clear" }).click());
    expect(screen.getByLabelText("name")).toHaveValue("");
    first.unmount();
    render(<Probe />);
    expect(screen.getByLabelText("name")).toHaveValue("");
  });

  it("ignores a draft that does not fit the form", () => {
    window.sessionStorage.setItem("aqmola:draft:x", JSON.stringify({ name: 5 }));
    render(<Probe />);
    expect(screen.getByRole("status")).toHaveTextContent(JSON.stringify(EMPTY));
    window.sessionStorage.setItem("aqmola:draft:x", "not json");
    const { unmount } = render(<Probe id="x" />);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent(JSON.stringify(EMPTY));
    unmount();
  });
});
