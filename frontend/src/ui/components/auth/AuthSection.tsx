import { type FormEvent, useMemo, useState } from "react";
import type { AuthSession } from "../../../api/ecoeats-api";

type AuthSectionProps = {
  onRegister: (params: {
    firstName: string;
    lastName: string;
    birthDate: string;
    phone: string;
    email: string;
    password: string;
    accountType: "INDIVIDUAL" | "BUSINESS";
    actorRole: "CLIENT" | "COURIER" | "RESTAURANT";
  }) => Promise<AuthSession>;
  onLogin: (params: { email: string; password: string }) => Promise<AuthSession>;
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthSection({ onRegister, onLogin, onAuthenticated }: AuthSectionProps) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | null>(null);
  const [step, setStep] = useState<"MODE_SELECTION" | "ACCOUNT_TYPE_SELECTION" | "FORM">(
    "MODE_SELECTION"
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
  const [actorRole, setActorRole] = useState<"CLIENT" | "COURIER" | "RESTAURANT">("CLIENT");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = useMemo(() => {
    if (accountType === "BUSINESS") {
      return [{ value: "RESTAURANT" as const, label: "Restaurant" }];
    }
    return [
      { value: "CLIENT" as const, label: "Client" },
      { value: "COURIER" as const, label: "Livreur" },
    ];
  }, [accountType]);

  const isRegisterMode = mode === "REGISTER";
  const isLoginMode = mode === "LOGIN";

  function selectMode(nextMode: "LOGIN" | "REGISTER") {
    setStatusMessage("");
    setMode(nextMode);
    if (nextMode === "LOGIN") {
      setStep("FORM");
      return;
    }
    setStep("ACCOUNT_TYPE_SELECTION");
  }

  function selectAccountTypeFromPopup(nextType: "INDIVIDUAL" | "BUSINESS") {
    syncRoleWithAccountType(nextType);
    setStep("FORM");
  }

  function backToModeSelection() {
    setStep("MODE_SELECTION");
    setMode(null);
    setStatusMessage("");
  }

  function syncRoleWithAccountType(nextType: "INDIVIDUAL" | "BUSINESS") {
    setAccountType(nextType);
    if (nextType === "BUSINESS") {
      setActorRole("RESTAURANT");
      return;
    }
    if (actorRole === "RESTAURANT") setActorRole("CLIENT");
  }

  async function submitRegistration() {
    setStatusMessage("");
    setIsSubmitting(true);
    try {
      const session = await onRegister({
        firstName,
        lastName,
        birthDate,
        phone,
        email,
        password,
        accountType,
        actorRole,
      });
      onAuthenticated(session);
    } catch (error: any) {
      setStatusMessage(error?.message ?? JSON.stringify(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitLogin() {
    setStatusMessage("");
    setIsSubmitting(true);
    try {
      const session = await onLogin({ email, password });
      onAuthenticated(session);
    } catch (error: any) {
      setStatusMessage(error?.message ?? JSON.stringify(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRegisterMode) {
      submitRegistration().catch(() => {});
      return;
    }
    submitLogin().catch(() => {});
  }

  if (step === "MODE_SELECTION") {
    return (
      <div className="auth-screen">
        <div className="card auth-card auth-modal">
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>EcoEats</div>
          <div className="muted" style={{ marginBottom: 16 }}>
            Choisissez une action
          </div>
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <button type="button" onClick={() => selectMode("REGISTER")}>
              Inscription
            </button>
            <button type="button" className="secondary" onClick={() => selectMode("LOGIN")}>
              Connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ACCOUNT_TYPE_SELECTION") {
    return (
      <div className="auth-screen">
        <div className="card auth-card auth-modal">
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Type de compte</div>
          <div className="muted" style={{ marginBottom: 16 }}>
            Choisissez Particulier ou Entreprise
          </div>
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <button type="button" onClick={() => selectAccountTypeFromPopup("INDIVIDUAL")}>
              Particulier
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => selectAccountTypeFromPopup("BUSINESS")}
            >
              Entreprise
            </button>
            <button type="button" className="secondary" onClick={backToModeSelection}>
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card auth-modal">
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>EcoEats</div>
        <div className="muted" style={{ marginBottom: 16 }}>
          {isRegisterMode ? "Creer un compte" : "Connexion"}
        </div>

        <div className="row" style={{ marginBottom: 14, justifyContent: "flex-start" }}>
          <button
            type="button"
            className={isRegisterMode ? "" : "secondary"}
            onClick={backToModeSelection}
          >
            Retour
          </button>
          {isRegisterMode ? (
            <div className="pill" style={{ fontSize: 13 }}>
              {accountType === "INDIVIDUAL" ? "Particulier" : "Entreprise"}
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit}>
          {isRegisterMode ? (
            <div style={{ marginBottom: 10 }}>
              <label className="muted">Prenom</label>
              <input
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Ex: Alex"
                style={{ width: "100%", boxSizing: "border-box", marginTop: 6 }}
              />
            </div>
          ) : null}

          {isRegisterMode ? (
            <div style={{ marginBottom: 10 }}>
              <label className="muted">Nom</label>
              <input
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Ex: Martin"
                style={{ width: "100%", boxSizing: "border-box", marginTop: 6 }}
              />
            </div>
          ) : null}

          {isRegisterMode ? (
            <div className="auth-grid" style={{ marginBottom: 10 }}>
              <div>
                <label className="muted">Date de naissance</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", marginTop: 6 }}
                />
              </div>
              <div>
                <label className="muted">Telephone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Ex: 0612345678"
                  style={{ width: "100%", boxSizing: "border-box", marginTop: 6 }}
                />
              </div>
            </div>
          ) : null}

          <div style={{ marginBottom: 10 }}>
            <label className="muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@email.com"
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="muted">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6 }}
            />
          </div>

          {isRegisterMode ? (
            <div className="auth-grid" style={{ marginBottom: 14, gridTemplateColumns: "1fr" }}>
              <div>
                <label className="muted">Profil</label>
                <select
                  value={actorRole}
                  onChange={(event) =>
                    setActorRole(event.target.value as "CLIENT" | "COURIER" | "RESTAURANT")
                  }
                  style={{ width: "100%", marginTop: 6 }}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <button type="submit" disabled={isSubmitting} style={{ width: "100%" }}>
            {isRegisterMode ? "Creer mon compte" : "Me connecter"}
          </button>
        </form>

        {statusMessage ? (
          <div className="muted" style={{ marginTop: 12 }}>
            {statusMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
