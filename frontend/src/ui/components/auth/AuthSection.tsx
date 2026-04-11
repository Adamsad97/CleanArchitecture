import { type FormEvent, type ReactElement, type RefObject, useRef, useState } from "react";
import type { AuthSession } from "../../../api/ecoeats-api";

type AuthSectionProps = {
  onRegister: (params: {
    firstName: string;
    lastName: string;
    restaurantName?: string | undefined;
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

type RegisterRole = "CLIENT" | "COURIER" | "RESTAURANT";

function roleCardTitle(role: RegisterRole): string {
  if (role === "CLIENT") return "Inscription Client";
  if (role === "COURIER") return "Inscription Livreur";
  return "Inscription Restaurant / Entreprise";
}

function roleSubtitle(role: RegisterRole): string {
  if (role === "CLIENT") return "Inscription en tant que Client";
  if (role === "COURIER") return "Inscription en tant que Livreur";
  return "Inscription en tant que Restaurant / Entreprise";
}

function roleIcon(role: RegisterRole): ReactElement {
  if (role === "CLIENT") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="currentColor" />
      </svg>
    );
  }

  if (role === "COURIER") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="18" r="2" fill="currentColor" />
        <circle cx="18" cy="18" r="2" fill="currentColor" />
        <path d="M7 18h7l3-5h-5l-2-4H7" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M10 9h4" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9h18v11H3z" fill="currentColor" opacity="0.25" />
      <path d="M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M3 11h18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function roleClass(role: RegisterRole): string {
  if (role === "CLIENT") return "auth-role-client";
  if (role === "COURIER") return "auth-role-courier";
  return "auth-role-restaurant";
}

function fileNameLabel(file: File | null): string {
  return file ? file.name : "Aucun fichier selectionne";
}

export function AuthSection({ onRegister, onLogin, onAuthenticated }: AuthSectionProps) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | null>(null);
  const [step, setStep] = useState<"MODE_SELECTION" | "ROLE_SELECTION" | "FORM">("MODE_SELECTION");

  const [actorRole, setActorRole] = useState<RegisterRole>("CLIENT");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [courierVehicle, setCourierVehicle] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [restaurantSiret, setRestaurantSiret] = useState("");
  const [courierIdentityFile, setCourierIdentityFile] = useState<File | null>(null);
  const [courierLicenseFile, setCourierLicenseFile] = useState<File | null>(null);
  const [restaurantProofFile, setRestaurantProofFile] = useState<File | null>(null);

  const courierIdentityInputRef = useRef<HTMLInputElement | null>(null);
  const courierLicenseInputRef = useRef<HTMLInputElement | null>(null);
  const restaurantProofInputRef = useRef<HTMLInputElement | null>(null);

  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegisterMode = mode === "REGISTER";

  function renderFilePicker(params: {
    label: string;
    file: File | null;
    inputRef: RefObject<HTMLInputElement | null>;
    onChange: (file: File | null) => void;
  }) {
    return (
      <div className="auth-file-row">
        <div className="auth-file-label">{params.label}</div>
        <input
          ref={params.inputRef}
          type="file"
          className="auth-file-input"
          onChange={(event) => params.onChange(event.target.files?.[0] ?? null)}
        />
        <button type="button" className="auth-file-button secondary" onClick={() => params.inputRef.current?.click()}>
          Télécharger
        </button>
        <div className="auth-file-name">{fileNameLabel(params.file)}</div>
      </div>
    );
  }

  function selectMode(nextMode: "LOGIN" | "REGISTER") {
    setStatusMessage("");
    setMode(nextMode);
    setStep(nextMode === "REGISTER" ? "ROLE_SELECTION" : "FORM");
  }

  function selectRegisterRole(role: RegisterRole) {
    setActorRole(role);
    setStep("FORM");
  }

  function backToModeSelection() {
    setStatusMessage("");
    setMode(null);
    setStep("MODE_SELECTION");
  }

  function backToRoleSelection() {
    setStatusMessage("");
    setStep("ROLE_SELECTION");
  }

  async function submitRegistration() {
    if (password !== confirmPassword) {
      setStatusMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!acceptTerms) {
      setStatusMessage("Veuillez accepter les conditions generales.");
      return;
    }

    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const session = await onRegister({
        firstName,
        lastName,
        restaurantName: actorRole === "RESTAURANT" ? lastName : undefined,
        birthDate: actorRole === "RESTAURANT" ? new Date().toISOString().slice(0, 10) : birthDate,
        phone,
        email,
        password,
        accountType: actorRole === "RESTAURANT" ? "BUSINESS" : "INDIVIDUAL",
        actorRole,
      });
      onAuthenticated(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      setStatusMessage(message);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      setStatusMessage(message);
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
        <div className="card auth-card auth-modal auth-entry-card">
          <div className="auth-mode-badge">EcoEats</div>
          <div className="auth-mode-title">Bienvenue sur EcoEats</div>
          <div className="auth-segmented-actions">
            <button type="button" className="auth-segmented-button active" onClick={() => selectMode("REGISTER")}>
              Inscription
            </button>
            <button
              type="button"
              className="auth-segmented-button"
              onClick={() => selectMode("LOGIN")}
            >
              Connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ROLE_SELECTION") {
    return (
      <div className="auth-screen">
        <div className="card auth-card auth-modal auth-entry-card">
          <div className="auth-mode-title">Choisissez votre profil</div>
          <div className="auth-role-choice-list">
            <button
              type="button"
              className="auth-role-choice-button auth-role-client"
              onClick={() => selectRegisterRole("CLIENT")}
            >
              <span className="auth-role-choice-icon">{roleIcon("CLIENT")}</span>
              <span>Client</span>
            </button>
            <button
              type="button"
              className="auth-role-choice-button auth-role-courier"
              onClick={() => selectRegisterRole("COURIER")}
            >
              <span className="auth-role-choice-icon">{roleIcon("COURIER")}</span>
              <span>Livreur</span>
            </button>
            <button
              type="button"
              className="auth-role-choice-button auth-role-restaurant"
              onClick={() => selectRegisterRole("RESTAURANT")}
            >
              <span className="auth-role-choice-icon">{roleIcon("RESTAURANT")}</span>
              <span>Restaurant</span>
            </button>
          </div>
          <button type="button" className="secondary" onClick={backToModeSelection}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!isRegisterMode) {
    return (
      <div className="auth-screen">
        <div className="card auth-card auth-modal">
          <div className="auth-headline">Connexion</div>
          <div className="auth-subline">Accedez a votre espace EcoEats</div>

          <div className="auth-actions-inline auth-actions-inline-spaced">
            <button type="button" className="secondary" onClick={backToModeSelection}>
              Retour
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Adresse Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@email.com"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="auth-submit-button">
              Me connecter
            </button>
          </form>

          {statusMessage ? <div className="auth-status-message">{statusMessage}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className={`card auth-card auth-modal auth-register-card ${roleClass(actorRole)}`}>
        <div className="auth-register-header">
          <div className="auth-role-card-icon">{roleIcon(actorRole)}</div>
          <div className="auth-register-title">{roleCardTitle(actorRole)}</div>
        </div>

        <div className="auth-register-subtitle">{roleSubtitle(actorRole)}</div>
  <div className="auth-divider" />

        <div className="auth-actions-inline auth-actions-inline-spaced">
          <button type="button" className="secondary" onClick={backToRoleSelection}>
            Changer de profil
          </button>
          <button type="button" className="secondary" onClick={backToModeSelection}>
            Retour
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">
              {actorRole === "RESTAURANT" ? "Nom de l'etablissement" : "Nom"}
            </label>
            <input
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder={actorRole === "RESTAURANT" ? "ex: Planet Burger" : ""}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">
              {actorRole === "RESTAURANT" ? "Nom complet du responsable" : "Prenom"}
            </label>
            <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </div>

          <div className="auth-field">
            <label className="auth-label">Adresse Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Telephone</label>
            <input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>

          {actorRole !== "RESTAURANT" ? (
            <div className="auth-field">
              <label className="auth-label">Date de naissance</label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="auth-field">
                <label className="auth-label">Adresse du Restaurant</label>
                <input
                  required
                  value={restaurantAddress}
                  onChange={(event) => setRestaurantAddress(event.target.value)}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Numero SIRET</label>
                <input required value={restaurantSiret} onChange={(event) => setRestaurantSiret(event.target.value)} />
              </div>
              {renderFilePicker({
                label: "Justificatif d'entreprise",
                file: restaurantProofFile,
                inputRef: restaurantProofInputRef,
                onChange: setRestaurantProofFile,
              })}
            </>
          )}

          {actorRole === "COURIER" ? (
            <>
              <div className="auth-field">
                <label className="auth-label">Vehicule (Velo, Moto, Voiture)</label>
                <select value={courierVehicle} onChange={(event) => setCourierVehicle(event.target.value)}>
                  <option value="">Selectionnez un vehicule</option>
                  <option value="VELO">Velo</option>
                  <option value="MOTO">Moto</option>
                  <option value="VOITURE">Voiture</option>
                </select>
              </div>
              {renderFilePicker({
                label: "Piece d'identite (CIN ou Passeport)",
                file: courierIdentityFile,
                inputRef: courierIdentityInputRef,
                onChange: setCourierIdentityFile,
              })}
              {renderFilePicker({
                label: "Permis de Conduire",
                file: courierLicenseFile,
                inputRef: courierLicenseInputRef,
                onChange: setCourierLicenseFile,
              })}
            </>
          ) : null}

          <div className="auth-grid">
            <div className="auth-field">
              <label className="auth-label">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>

          <label className="auth-legal-check">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
            />
            J'accepte les conditions generales
          </label>

          <button type="submit" disabled={isSubmitting} className="auth-submit-button">
            S'inscrire
          </button>
        </form>

        <div className="auth-footer-link">
          Vous avez deja un compte ?
          <button type="button" className="auth-link-button" onClick={() => selectMode("LOGIN")}>
            Connexion
          </button>
        </div>

        <div className="auth-divider" />

        {statusMessage ? <div className="auth-status-message">{statusMessage}</div> : null}
      </div>
    </div>
  );
}
