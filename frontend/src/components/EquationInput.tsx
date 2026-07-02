// EquationInput (US-001): validated equation entry with inline error state.
import { useState, type FormEvent } from "react";
import { ArrowRight, Calculator, Loader2 } from "lucide-react";

interface Props {
  onSolve: (expression: string) => void;
  disabled?: boolean;
  errorMessage?: string | null;
}

export function EquationInput({ onSolve, disabled, errorMessage }: Props) {
  const [value, setValue] = useState("2x + 4 = 12");

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSolve(trimmed);
  }

  const hasError = Boolean(errorMessage);

  return (
    <form className="equation-input" onSubmit={submit}>
      <label htmlFor="expression">Enter an equation or expression</label>
      <div className={`equation-input-row${hasError ? " has-error" : ""}`}>
        <Calculator className="equation-input-icon" size={18} strokeWidth={2} aria-hidden="true" />
        <input
          id="expression"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 3x + 2 = x + 10"
          aria-invalid={hasError}
          aria-describedby={hasError ? "expression-error" : undefined}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled} className="icon-button">
          {disabled ? (
            <>
              <Loader2 size={16} className="spin" /> Solving…
            </>
          ) : (
            <>
              Solve <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
      {hasError && (
        <p id="expression-error" role="alert" className="auth-error">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
