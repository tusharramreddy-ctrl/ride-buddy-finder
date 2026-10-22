"use client";

import { useRef, useState } from "react";
import { scoreQuiz } from "@/lib/quiz";
import { deleteProfile, loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { findRider } from "@/lib/riders";
import { IntroPanel } from "./IntroPanel";
import { ProfileCard } from "./ProfileCard";
import { ProfileForm, type ProfileBasics } from "./ProfileForm";
import { Quiz } from "./Quiz";
import { RiderCard } from "./RiderCard";
import { ErrorMessage, postJson } from "./ui";

type Mode = "create" | "quiz" | "profile" | "edit";
type MatchResult = { riderId: string; reason: string };

// Rendered only in the browser (see ClientApp), so it can read the saved
// profile straight away.
export function App() {
  const [initial] = useState(loadProfile);
  const [mode, setMode] = useState<Mode>(initial.profile ? "profile" : "create");
  const [profile, setProfile] = useState<Profile | null>(initial.profile);
  const [basics, setBasics] = useState<ProfileBasics | null>(null);
  const [notice, setNotice] = useState(
    initial.wasBroken ? "We couldn't read your saved profile, so let's set it up again." : "",
  );
  const [justCreated, setJustCreated] = useState(false);

  const [finding, setFinding] = useState(false);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [matchNote, setMatchNote] = useState("");
  const [matchError, setMatchError] = useState("");

  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [intro, setIntro] = useState<{ riderId: string; text: string } | null>(null);
  const [introError, setIntroError] = useState("");
  const introRef = useRef<HTMLDivElement>(null);

  function clearResults() {
    setMatches(null);
    setMatchNote("");
    setMatchError("");
    setIntro(null);
    setIntroError("");
  }

  function store(next: Profile, created: boolean) {
    if (!saveProfile(next)) {
      setNotice("Your browser isn't letting us save, so your profile will be forgotten when you close this page.");
    }
    setProfile(next);
    setJustCreated(created);
    clearResults();
    setMode("profile");
  }

  function finishQuiz(answers: number[]) {
    const character = scoreQuiz(answers);
    if (!basics || !character) return;
    store({ version: 1, ...basics, quizAnswers: answers, character }, true);
  }

  async function findRiders() {
    if (!profile) return;
    clearResults();
    setFinding(true);
    const res = await postJson<{ matches: MatchResult[]; note?: string }>("/api/match", { profile });
    setFinding(false);
    if (!res.ok) {
      setMatchError(res.error);
      return;
    }
    setMatches(res.data.matches);
    setMatchNote(res.data.note ?? "");
  }

  async function draft(riderId: string) {
    if (!profile) return;
    setIntroError("");
    setDraftingId(riderId);
    const res = await postJson<{ message: string }>("/api/intro", { profile, riderId });
    setDraftingId(null);
    if (!res.ok) {
      setIntroError(res.error);
      return;
    }
    setIntro({ riderId, text: res.data.message });
    requestAnimationFrame(() => introRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function remove() {
    if (!window.confirm("Delete your profile from this device? This can't be undone.")) return;
    deleteProfile();
    setProfile(null);
    setBasics(null);
    clearResults();
    setNotice("");
    setMode("create");
  }

  const introRider = intro ? findRider(intro.riderId) : undefined;

  return (
    <div className="space-y-6">
      {notice && <ErrorMessage>{notice}</ErrorMessage>}

      {mode === "create" && (
        <ProfileForm
          initial={basics ?? undefined}
          onDone={(b) => {
            setBasics(b);
            setMode("quiz");
          }}
        />
      )}

      {mode === "quiz" && (
        <Quiz onDone={finishQuiz} onBack={() => setMode(profile ? "profile" : "create")} />
      )}

      {mode === "edit" && profile && (
        <ProfileForm
          initial={profile}
          onCancel={() => setMode("profile")}
          onDone={(b) => store({ ...profile, ...b }, false)}
        />
      )}

      {mode === "profile" && profile && (
        <>
          <ProfileCard
            profile={profile}
            justCreated={justCreated}
            finding={finding}
            onFind={findRiders}
            onEdit={() => setMode("edit")}
            onRetake={() => {
              setBasics(profile);
              setMode("quiz");
            }}
            onDelete={remove}
          />

          <ErrorMessage>{matchError}</ErrorMessage>

          {matches && (
            <section aria-labelledby="matches-heading" className="space-y-4">
              <div>
                <h2 id="matches-heading" className="text-xl font-bold">
                  {matches.length > 0 ? "Riders you might enjoy riding with" : "No matches yet"}
                </h2>
                {matchNote && <p className="mt-1 text-sm text-muted">{matchNote}</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {matches.map((m) => {
                  const rider = findRider(m.riderId);
                  if (!rider) return null;
                  return (
                    <RiderCard
                      key={rider.id}
                      rider={rider}
                      reason={m.reason}
                      selected={intro?.riderId === rider.id}
                      drafting={draftingId === rider.id}
                      onDraft={() => draft(rider.id)}
                    />
                  );
                })}
              </div>
              <ErrorMessage>{introError}</ErrorMessage>
            </section>
          )}

          {intro && introRider && (
            <div ref={introRef} className="scroll-mt-4">
              <IntroPanel
                riderName={introRider.name}
                text={intro.text}
                onChange={(text) => setIntro({ ...intro, text })}
                onRedraft={() => draft(intro.riderId)}
                redrafting={draftingId === intro.riderId}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
