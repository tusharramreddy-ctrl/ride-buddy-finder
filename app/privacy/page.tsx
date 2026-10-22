import type { Metadata } from "next";
import { CONTACT_URL, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy · Ride Buddy",
  description: "What Ride Buddy collects, why, where it's stored, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <section>
        <p>
          Ride Buddy is a community for motorcycle riders, built as a hackathon project. This page explains, in plain
          language, what information the app collects, why, where it&apos;s kept, and how you can remove it.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Sign-in details:</strong> your email address. If you sign in with Google, we also receive your name and
            profile photo from Google. We never see your Google password.
          </li>
          <li>
            <strong>Your rider profile:</strong> display name, username, bio, riding level, riding style, the times you&apos;re
            usually free, and an <em>approximate</em> area (never an exact address).
          </li>
          <li>
            <strong>Optional gender:</strong> only if you choose to give it. It&apos;s stored privately, used only for the
            &ldquo;women riders only&rdquo; match filter, and shown on your profile only if you turn that on.
          </li>
          <li>
            <strong>What you share:</strong> posts, photos, comments, likes, messages, group memberships, and your bikes.
          </li>
          <li>
            <strong>Rides:</strong> if you track a ride, the GPS route, distance and time. Location is used only while you
            have a ride running on the Map screen, after you allow it.
          </li>
          <li>
            <strong>Safety actions:</strong> who you block and any reports you file.
          </li>
        </ul>
      </section>

      <section>
        <h2>How it&apos;s used</h2>
        <ul>
          <li>To run the app: show your profile, posts and messages, and keep you signed in.</li>
          <li>
            To suggest riding buddies. When you use matching, the text you type and your match preferences are sent to an
            AI model (Google Gemini, through OpenRouter) to read your description, rank suitable riders and draft an
            introduction. Safety filters such as availability, area and the women-only option are applied by plain code,
            not by AI.
          </li>
          <li>We don&apos;t sell your data, show ads, or use it for anything unrelated to Ride Buddy.</li>
        </ul>
      </section>

      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Your profile, bikes, posts, comments and group messages are visible to other signed-in riders.</li>
          <li>Direct messages are visible only to you and the person you&apos;re messaging.</li>
          <li>
            Your rides and full GPS routes are private to you. If you choose to share a ride, the post shows distance, time
            and a route with the first and last 300&nbsp;m removed, so your start and end points (often home) stay hidden.
          </li>
          <li>Blocks and reports are private. Reports are stored, but there is no moderation team reviewing them yet.</li>
        </ul>
      </section>

      <section>
        <h2>Where it&apos;s stored</h2>
        <ul>
          <li>Your account and data are stored with Supabase (database, file storage and sign-in), in their Mumbai region.</li>
          <li>The website is hosted by Vercel.</li>
          <li>Matching and intro requests are processed by OpenRouter and the AI model provider they route to.</li>
          <li>Map tiles come from OpenFreeMap (OpenStreetMap data); they don&apos;t receive your account details.</li>
          <li>Your theme choice and posts you hide are remembered in your own browser.</li>
        </ul>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          In the app, go to <strong>Profile → Edit profile → Delete all my Ride Buddy data</strong>. This removes your
          profile, bikes, posts, comments, likes, messages you sent, group memberships, rides and blocks. To also remove your
          sign-in account itself, contact us (below) and we&apos;ll delete it.
        </p>
      </section>

      <section>
        <h2>Riders marked &ldquo;Demo&rdquo;</h2>
        <p>
          Some riders, posts and groups are fictional examples to show how the app works. They&apos;re always labelled Demo
          and are not real people.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>Ride Buddy is meant for adult riders. Please don&apos;t use it if you&apos;re under 18.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, we&apos;ll update this page and the date at the top. Questions or deletion requests:{" "}
          <a href={CONTACT_URL}>open an issue on the project&apos;s GitHub page</a>.
        </p>
      </section>
    </LegalPage>
  );
}
