import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import "@fontsource/noto-sans-myanmar/400.css";
import { api } from "../../convex/_generated/api";
import FieldWrapper from "../components/FieldWrapper";
import { BilingualBlock } from "../components/Bilingual";
import { labels } from "../labels";
import { portalLabels } from "../portal/portalLabels";
import "./Register.css";

export default function Register() {
  const register = useMutation(api.people.register);

  const [isUnder13, setIsUnder13] = useState(false);
  const [parentGuardianName, setParentGuardianName] = useState("");
  const [name, setName] = useState("");
  const [nameBurmese, setNameBurmese] = useState("");
  const [nickname, setNickname] = useState("");
  const [debouncedNickname, setDebouncedNickname] = useState("");
  const [email, setEmail] = useState("");
  const [camp, setCamp] = useState("");
  const [town, setTown] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [ambition, setAmbition] = useState("");
  const [school, setSchool] = useState("");
  const [interests, setInterests] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedNickname(nickname.trim()), 400);
    return () => clearTimeout(timeout);
  }, [nickname]);

  const nicknameAvailable = useQuery(
    api.people.checkNicknameAvailable,
    debouncedNickname ? { nickname: debouncedNickname } : "skip"
  );
  const nicknameTaken = debouncedNickname !== "" && nicknameAvailable === false;
  const restOfFormDisabled = isUnder13 && parentGuardianName.trim() === "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (nicknameTaken) {
      setFormError("That nickname is already taken — try another.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        name,
        isUnder13,
        parentGuardianName: isUnder13 ? parentGuardianName || undefined : undefined,
        nameBurmese: nameBurmese || undefined,
        nickname: nickname || undefined,
        email: email || undefined,
        camp: camp || undefined,
        town: town || undefined,
        region: region || undefined,
        country: country || undefined,
        birthdate: birthdate || undefined,
        ambition: ambition || undefined,
        school: school || undefined,
        interests: interests || undefined,
      });
      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof ConvexError && typeof err.data === "string"
          ? err.data
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="register-page confirmation">
        <h1>Thank you!</h1>
        <p>Your registration was received. A teacher will review it soon.</p>
      </div>
    );
  }

  return (
    <div className="register-page">
      <h1>Register</h1>
      <div className="returning-notice">
        <BilingualBlock as="strong" text={portalLabels.returningNoticeHeading} />
        <p>
          Don't register again, just <a href="/portal/claim">claim your account</a>.
        </p>
        {portalLabels.returningNoticeBody.my && (
          <p lang="my" className="lang-my">
            {portalLabels.returningNoticeBody.my}
          </p>
        )}
      </div>
      <p className="intro">Fill in what you know. Most fields are optional.</p>
      <form onSubmit={handleSubmit}>
        <FieldWrapper labelKey="under13" htmlFor="under13-yes">
          <label className="radio-option">
            <input
              type="radio"
              id="under13-yes"
              name="under13"
              checked={isUnder13 === true}
              onChange={() => setIsUnder13(true)}
            />
            Yes
          </label>
          <label className="radio-option">
            <input
              type="radio"
              id="under13-no"
              name="under13"
              checked={isUnder13 === false}
              onChange={() => {
                setIsUnder13(false);
                setParentGuardianName("");
              }}
            />
            No
          </label>
        </FieldWrapper>

        {isUnder13 && (
          <FieldWrapper labelKey="parentGuardianName" htmlFor="parentGuardianName">
            <input
              id="parentGuardianName"
              value={parentGuardianName}
              onChange={(e) => setParentGuardianName(e.target.value)}
              required
            />
          </FieldWrapper>
        )}

        <FieldWrapper labelKey="name" htmlFor="name">
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={restOfFormDisabled}
            required
          />
        </FieldWrapper>

        <FieldWrapper labelKey="nameBurmese" htmlFor="nameBurmese">
          <input
            id="nameBurmese"
            lang="my"
            value={nameBurmese}
            onChange={(e) => setNameBurmese(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="nickname" htmlFor="nickname">
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={restOfFormDisabled}
          />
          {nicknameTaken && <p className="field-error">That nickname is already taken — try another.</p>}
          {debouncedNickname && nicknameAvailable === true && (
            <p className="field-ok">That nickname is available.</p>
          )}
        </FieldWrapper>

        <FieldWrapper labelKey="email" htmlFor="email">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="camp" htmlFor="camp">
          <input
            id="camp"
            value={camp}
            onChange={(e) => setCamp(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="town" htmlFor="town">
          <input
            id="town"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="region" htmlFor="region">
          <input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="country" htmlFor="country">
          <input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="birthdate" htmlFor="birthdate">
          <input
            id="birthdate"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="ambition" htmlFor="ambition">
          <input
            id="ambition"
            value={ambition}
            onChange={(e) => setAmbition(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="school" htmlFor="school">
          <input
            id="school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        <FieldWrapper labelKey="interests" htmlFor="interests">
          <textarea
            id="interests"
            rows={3}
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            disabled={restOfFormDisabled}
          />
        </FieldWrapper>

        {formError && <p className="form-error">{formError}</p>}

        <button
          type="submit"
          className="submit-button"
          disabled={submitting || nicknameTaken || restOfFormDisabled}
        >
          {labels.submit.en}
          {labels.submit.my ? ` / ${labels.submit.my}` : ""}
        </button>
      </form>
    </div>
  );
}
